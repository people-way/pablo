import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import manifest from "../../app/manifest";

const ORIGIN = "https://pablo.test";

type SwApi = {
  CACHE_VERSION: string;
  shouldBypass: (url: string) => boolean;
  classifyRequest: (url: string) => string;
  cachesToDelete: (names: string[], current?: string) => string[];
  collectAssets: (source: string) => string[];
};

type FetchListener = (event: {
  request: { method: string; url: string; mode: string; headers: { get: () => null } };
  respondWith: (value: unknown) => void;
}) => void;

function loadWorker() {
  const listeners = new Map<string, FetchListener>();
  const context = {
    URL,
    Response,
    Request,
    Headers,
    console,
    location: { origin: ORIGIN },
    fetch: async () => new Response("ok", { status: 200 }),
    caches: {
      async open() {
        return {
          async match() {
            return undefined;
          },
          async put() {},
        };
      },
      async keys() {
        return [];
      },
      async delete() {
        return true;
      },
    },
    clients: { async claim() {} },
    skipWaiting() {},
    addEventListener(type: string, listener: FetchListener) {
      listeners.set(type, listener);
    },
  };
  const sandbox = vm.createContext({ ...context, self: null as unknown });
  (sandbox as { self: unknown }).self = sandbox;
  vm.runInContext(readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8"), sandbox, {
    filename: "sw.js",
  });
  const api = (sandbox as { pabloSw: SwApi }).pabloSw;
  return { api, listeners };
}

const { api, listeners } = loadWorker();

test("manifest launches the review tool as a standalone app", () => {
  const data = manifest();
  assert.equal(data.name, "Pablo");
  assert.equal(data.short_name, "Pablo");
  assert.equal(data.start_url, "/revue");
  assert.equal(data.display, "standalone");
  assert.equal(data.background_color, "#0a0b0c");
  assert.equal(data.theme_color, "#0a0b0c");
  const icons = data.icons ?? [];
  assert.ok(icons.some((icon) => icon.sizes === "192x192" && icon.purpose === "any"));
  assert.ok(icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "any"));
  assert.ok(icons.some((icon) => icon.purpose === "maskable" && icon.sizes === "512x512"));
  assert.ok(icons.some((icon) => icon.purpose === "maskable" && icon.sizes === "192x192"));
});

test("service worker never caches api, auth, login, or dashboard", () => {
  for (const path of [
    "/api/analyze",
    "/api/auth/session",
    "/api/revue/chess-com?username=hikaru",
    "/auth/callback?code=1",
    "/login",
    "/login?next=/revue",
    "/dashboard",
    "/dashboard/settings",
  ]) {
    const url = `${ORIGIN}${path}`;
    assert.equal(api.shouldBypass(url), true, path);
    assert.equal(api.classifyRequest(url), "bypass", path);
    assert.equal(fetchWasHandled(url), false, path);
  }
});

test("service worker never caches Supabase or Chess.com", () => {
  for (const url of [
    "https://abc.supabase.co/rest/v1/profiles",
    "https://abc.supabase.co/auth/v1/token",
    "https://api.chess.com/pub/player/hikaru/games",
    "https://www.chess.com/game/live/1",
    "https://images.chess.com/piece.png",
  ]) {
    assert.equal(api.shouldBypass(url), true, url);
    assert.equal(fetchWasHandled(url), false, url);
  }
});

test("service worker caches the review shell and the engine", () => {
  assert.equal(api.classifyRequest(`${ORIGIN}/revue`), "shell");
  assert.equal(api.classifyRequest(`${ORIGIN}/engine/stockfish-18-lite-single.js`), "engine");
  assert.equal(api.classifyRequest(`${ORIGIN}/engine/stockfish-18-lite-single.wasm`), "engine");
  assert.equal(api.classifyRequest(`${ORIGIN}/_next/static/chunks/app.js`), "static");
  assert.equal(fetchWasHandled(`${ORIGIN}/revue`), true);
  assert.equal(fetchWasHandled(`${ORIGIN}/engine/stockfish-18-lite-single.wasm`), true);
  assert.equal(fetchWasHandled("https://api.chess.com/pub/player/x"), false);
});

test("activating a worker drops every cache except the current version", () => {
  assert.deepEqual(api.cachesToDelete(["pablo-shell-v1", "pablo-shell-v0", "other"], "pablo-shell-v1"), [
    "pablo-shell-v0",
    "other",
  ]);
  assert.equal(api.CACHE_VERSION, "pablo-shell-v1");
});

test("shell precache discovers Next static assets", () => {
  const html = `
    <script src="/_next/static/chunks/webpack-abc.js"></script>
    <link rel="stylesheet" href="/_next/static/chunks/app.css" />
    <script>self.__next_f.push("/_next/static/chunks/revue-page.js")</script>
  `;
  assert.deepEqual(Array.from(api.collectAssets(html)).sort(), [
    "/_next/static/chunks/app.css",
    "/_next/static/chunks/revue-page.js",
    "/_next/static/chunks/webpack-abc.js",
  ]);
});

function fetchWasHandled(url: string) {
  let handled = false;
  const fetchListener = listeners.get("fetch");
  assert.ok(fetchListener);
  fetchListener({
    request: {
      method: "GET",
      url,
      mode: url.endsWith("/revue") ? "navigate" : "same-origin",
      headers: { get: () => null },
    },
    respondWith() {
      handled = true;
    },
  });
  return handled;
}
