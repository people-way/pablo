/**
 * Pablo's app shell. CACHE_VERSION is the deploy fence: activate deletes every
 * other cache so a new worker cannot keep serving a previous shell.
 */
const CACHE_VERSION = "pablo-shell-v1";

const ENGINE_FILES = [
  "/engine/stockfish-18-lite-single.js",
  "/engine/stockfish-18-lite-single.wasm",
];

const PIECE_FILES = ["w", "b"].flatMap((color) =>
  ["K", "Q", "R", "B", "N", "P"].map((piece) => `/pieces/cburnett/${color}${piece}.svg`),
);

const SHELL_DOCUMENTS = ["/", "/revue"];

const SHELL_FILES = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
  "/apple-touch-icon.png",
  ...PIECE_FILES,
];

function shouldBypass(url) {
  let parsed;
  try {
    parsed = typeof url === "string" ? new URL(url) : new URL(url.href);
  } catch {
    return true;
  }

  const host = parsed.hostname.toLowerCase();
  if (host === "supabase.co" || host.endsWith(".supabase.co")) return true;
  if (host === "chess.com" || host.endsWith(".chess.com")) return true;
  if (parsed.origin !== self.location.origin) return true;

  const path = parsed.pathname;
  if (path === "/api" || path.startsWith("/api/")) return true;
  if (path === "/auth" || path.startsWith("/auth/")) return true;
  if (path === "/login" || path.startsWith("/login/")) return true;
  if (path === "/dashboard" || path.startsWith("/dashboard/")) return true;
  if (path === "/sw.js") return true;
  return false;
}

function classifyRequest(url) {
  const parsed = new URL(url, self.location.origin);
  if (shouldBypass(parsed)) return "bypass";
  if (parsed.pathname.startsWith("/engine/")) return "engine";
  if (parsed.pathname.startsWith("/_next/static/")) return "static";
  return "shell";
}

function cachesToDelete(existingNames, current = CACHE_VERSION) {
  return existingNames.filter((name) => name !== current);
}

function collectAssets(source) {
  const normalized = source.replace(/\\u002[fF]/g, "/").replace(/\\\//g, "/");
  const found = new Set();
  const pattern = /\/_next\/static\/[^"'<>\s)\\]+/g;
  for (const match of normalized.matchAll(pattern)) {
    found.add(match[0]);
  }
  return [...found];
}

async function asCacheable(response) {
  const headers = new Headers(response.headers);
  headers.delete("set-cookie");
  headers.delete("vary");
  headers.delete("content-encoding");
  headers.delete("content-length");
  return new Response(await response.arrayBuffer(), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function storeDocument(cache, path, response) {
  if (!response.ok || response.type !== "basic" || response.status !== 200) return;
  const headers = new Headers(response.headers);
  headers.delete("set-cookie");
  headers.delete("vary");
  headers.delete("content-encoding");
  headers.delete("content-length");
  const body = await response.arrayBuffer();
  await cache.put(
    path,
    new Response(body, {
      status: 200,
      statusText: "OK",
      headers,
    }),
  );
}

async function precacheUrl(cache, path, seen, required) {
  if (seen.has(path) || shouldBypass(new URL(path, self.location.origin).href)) return;
  seen.add(path);
  const response = await fetch(new Request(path, { credentials: "same-origin" }));
  if (!response.ok) {
    if (required) throw new Error(`Missing shell asset ${path}`);
    return;
  }
  const contentType = response.headers.get("content-type") || "";
  const textual =
    !path.endsWith(".wasm") &&
    (contentType.includes("javascript") ||
      contentType.includes("text/css") ||
      path.endsWith(".js") ||
      path.endsWith(".css"));
  const body = await response.arrayBuffer();
  const stored = await asCacheable(
    new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    }),
  );
  await cache.put(path, stored);
  if (!textual) return;
  const nested = collectAssets(new TextDecoder().decode(body));
  for (const asset of nested) {
    await precacheUrl(cache, asset, seen, false);
  }
}

async function precacheShell() {
  const cache = await caches.open(CACHE_VERSION);
  const seen = new Set();

  for (const path of ENGINE_FILES) {
    await precacheUrl(cache, path, seen, true);
  }

  for (const path of SHELL_FILES) {
    await precacheUrl(cache, path, seen, true);
  }

  for (const path of SHELL_DOCUMENTS) {
    const response = await fetch(new Request(path, { credentials: "same-origin" }));
    if (!response.ok) {
      throw new Error(`Missing shell document ${path}`);
    }
    const html = await response.clone().text();
    await storeDocument(cache, path, response);
    for (const asset of collectAssets(html)) {
      await precacheUrl(cache, asset, seen, true);
    }
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    await cache.put(request, await asCacheable(response.clone()));
  }
  return response;
}

async function networkFirstDocument(request) {
  const cache = await caches.open(CACHE_VERSION);
  const url = new URL(request.url);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic" && request.mode === "navigate") {
      await storeDocument(cache, url.pathname, response.clone());
    }
    return response;
  } catch {
    const cached =
      (await cache.match(url.pathname)) ||
      (request.mode === "navigate" ? await cache.match("/revue") : undefined);
    if (cached) return cached;
    return new Response("Hors ligne", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  const refreshed = fetch(request)
    .then(async (response) => {
      if (response.ok && response.type === "basic") {
        await cache.put(request, await asCacheable(response.clone()));
      }
      return response;
    })
    .catch(() => cached);

  if (cached) return cached;
  const response = await refreshed;
  if (response) return response;
  return new Response("Hors ligne", {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(cachesToDelete(names).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const kind = classifyRequest(request.url);
  if (kind === "bypass") return;

  if (kind === "engine" || kind === "static") {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstDocument(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

self.pabloSw = {
  CACHE_VERSION,
  shouldBypass,
  classifyRequest,
  cachesToDelete,
  collectAssets,
};
