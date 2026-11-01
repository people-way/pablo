import assert from "node:assert/strict";
import test from "node:test";
import { hubRewrites, upstreamOrigin } from "./upstreams";

test("rewrites keep each game under its public prefix", () => {
  const rewrites = hubRewrites({} as NodeJS.ProcessEnv);
  assert.deepEqual(
    rewrites.map((rewrite) => [rewrite.source, rewrite.destination]),
    [
      ["/pablo", "https://pablo-eight-beta.vercel.app/pablo"],
      ["/pablo/:path*", "https://pablo-eight-beta.vercel.app/pablo/:path*"],
      ["/street-tycoons", "https://street-tycoons.vercel.app/street-tycoons"],
      ["/street-tycoons/:path*", "https://street-tycoons.vercel.app/street-tycoons/:path*"],
    ],
  );
});

test("upstream origins come from env and ignore a pasted path", () => {
  const env = {
    PABLO_UPSTREAM_ORIGIN: "http://127.0.0.1:3000/pablo/",
    STREET_TYCOONS_UPSTREAM_ORIGIN: "https://street.example",
  } as NodeJS.ProcessEnv;
  assert.equal(upstreamOrigin("pablo", env), "http://127.0.0.1:3000");
  assert.equal(hubRewrites(env)[1]?.destination, "http://127.0.0.1:3000/pablo/:path*");
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
