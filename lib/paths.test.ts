import assert from "node:assert/strict";
import test from "node:test";
import {
  BASE_PATH,
  canonicalOrigin,
  legacyRedirects,
  metadataBaseUrl,
  stripBasePath,
  withBasePath,
} from "./paths";

test("withBasePath prefixes in-app URLs once", () => {
  assert.equal(BASE_PATH, "/pablo");
  assert.equal(withBasePath("/"), "/pablo");
  assert.equal(withBasePath("/revue"), "/pablo/revue");
  assert.equal(withBasePath("/api/revue/chess-com?username=ada"), "/pablo/api/revue/chess-com?username=ada");
  assert.equal(withBasePath("/pablo/revue"), "/pablo/revue");
  assert.equal(withBasePath("/auth/callback#x"), "/pablo/auth/callback#x");
});

test("stripBasePath removes one prefix and keeps the query", () => {
  assert.equal(stripBasePath("/pablo"), "/");
  assert.equal(stripBasePath("/pablo/dashboard"), "/dashboard");
  assert.equal(stripBasePath("/pablo/analyze?username=ada"), "/analyze?username=ada");
  assert.equal(stripBasePath("/revue"), "/revue");
  assert.equal(stripBasePath("/pablo//evil.example"), "//evil.example");
});

test("canonical origin is the origin only", () => {
  assert.equal(canonicalOrigin({} as NodeJS.ProcessEnv), "");
  assert.equal(
    canonicalOrigin({ PABLO_CANONICAL_ORIGIN: "https://anarchikgames.com/pablo" } as NodeJS.ProcessEnv),
    "https://anarchikgames.com",
  );
  assert.equal(
    canonicalOrigin({ PABLO_CANONICAL_ORIGIN: "javascript:alert(1)" } as NodeJS.ProcessEnv),
    "",
  );
});

test("legacy redirects stay on this host until the canonical origin is set", () => {
  const relative = legacyRedirects("");
  assert.equal(relative[0]?.destination, "/pablo");
  assert.equal(relative[1]?.destination, "/pablo/:path");
  assert.equal(relative[1]?.basePath, false);
  assert.match(relative[1]?.source ?? "", /sw\\.js/);

  const absolute = legacyRedirects("https://anarchikgames.com");
  assert.equal(absolute[0]?.destination, "https://anarchikgames.com/pablo");
  assert.equal(absolute[1]?.destination, "https://anarchikgames.com/pablo/:path");
});

test("metadata base includes the public prefix", () => {
  const url = metadataBaseUrl({
    PABLO_CANONICAL_ORIGIN: "https://anarchikgames.com",
  } as NodeJS.ProcessEnv);
  assert.equal(url.href, "https://anarchikgames.com/pablo/");
});
