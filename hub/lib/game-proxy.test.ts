import assert from "node:assert/strict";
import test from "node:test";
import { resolveProxyTarget, restoreSegmentRequest } from "./game-proxy";

test("segment file paths map back to the page the upstream actually serves", () => {
  assert.deepEqual(restoreSegmentRequest("/pablo/revue.segments/_tree.segment.rsc"), {
    pathname: "/pablo/revue",
    segment: "/_tree",
  });
  assert.deepEqual(restoreSegmentRequest("/street-tycoons/select.segments/_index.segment.rsc"), {
    pathname: "/street-tycoons/select",
    segment: "/_index",
  });
  assert.deepEqual(
    restoreSegmentRequest("/street-tycoons/street-tycoons.segments/_tree.segment.rsc"),
    { pathname: "/street-tycoons", segment: "/_tree" },
  );
  assert.equal(restoreSegmentRequest("/pablo/revue"), null);
});

test("a segment prefetch keeps the page URL and the query", () => {
  const target = resolveProxyTarget("/pablo/revue", "?_rsc=1r34m");
  assert.equal(target?.kind, "pablo");
  assert.equal(target?.segment, null);
  assert.equal(target?.url, "https://pablo-eight-beta.vercel.app/pablo/revue?_rsc=1r34m");
});

test("a rewritten segment file is fetched as the page on the upstream", () => {
  const target = resolveProxyTarget(
    "/street-tycoons/street-tycoons.segments/_tree.segment.rsc",
    "?_rsc=3hj8j",
  );
  assert.equal(target?.segment, "/_tree");
  assert.equal(target?.url, "https://street-tycoons.vercel.app/street-tycoons?_rsc=3hj8j");
});

test("analytics is proxied to Street Tycoons, which serves the script", () => {
  const target = resolveProxyTarget("/_vercel/insights/script.js");
  assert.equal(target?.kind, "insights");
  assert.equal(target?.url, "https://street-tycoons.vercel.app/_vercel/insights/script.js");
});

test("the studio home is not proxied", () => {
  assert.equal(resolveProxyTarget("/"), null);
  assert.equal(resolveProxyTarget("/icon.svg"), null);
});
