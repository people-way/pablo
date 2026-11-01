import assert from "node:assert/strict";
import test from "node:test";
import { hubRewrites, upstreamOrigin } from "./upstreams";

test("analytics rewrite points at the deployment that serves the script", () => {
  const rewrites = hubRewrites({} as NodeJS.ProcessEnv);
  assert.deepEqual(
    rewrites.map((rewrite) => [rewrite.source, rewrite.destination]),
    [["/_vercel/insights/:path*", "https://street-tycoons.vercel.app/_vercel/insights/:path*"]],
  );
});

test("upstream origins come from env and ignore a pasted path", () => {
  const env = {
    PABLO_UPSTREAM_ORIGIN: "http://127.0.0.1:3000/pablo/",
    STREET_TYCOONS_UPSTREAM_ORIGIN: "https://street.example",
  } as NodeJS.ProcessEnv;
  assert.equal(upstreamOrigin("pablo", env), "http://127.0.0.1:3000");
  assert.equal(
    hubRewrites(env)[0]?.destination,
    "https://street.example/_vercel/insights/:path*",
  );
  assert.equal(upstreamOrigin("street-tycoons", env), "https://street.example");
});

test("upstream origins reject credentials and junk", () => {
  assert.throws(() =>
    upstreamOrigin("pablo", { PABLO_UPSTREAM_ORIGIN: "https://user:secret@example.com" } as NodeJS.ProcessEnv),
  );
  assert.throws(() =>
    upstreamOrigin("pablo", { PABLO_UPSTREAM_ORIGIN: "not a url" } as NodeJS.ProcessEnv),
  );
});
