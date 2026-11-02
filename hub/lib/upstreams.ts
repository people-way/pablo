export type GameId = "pablo" | "street-tycoons";

const DEFAULT_ORIGINS: Record<GameId, string> = {
  pablo: "https://pablo-eight-beta.vercel.app",
  "street-tycoons": "https://street-tycoons.vercel.app",
};

const ENV_KEYS: Record<GameId, string> = {
  pablo: "PABLO_UPSTREAM_ORIGIN",
  "street-tycoons": "STREET_TYCOONS_UPSTREAM_ORIGIN",
};

/** Origin only. The mount path (`/pablo`, `/street-tycoons`) is added by the rewrite. */
export function upstreamOrigin(game: GameId, env: NodeJS.ProcessEnv = process.env): string {
  const raw = env[ENV_KEYS[game]]?.trim();
  const value = (raw || DEFAULT_ORIGINS[game]).replace(/\/$/, "");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid ${ENV_KEYS[game]}: ${value}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Invalid ${ENV_KEYS[game]}: ${value}`);
  }
  if (url.username || url.password) {
    throw new Error(`${ENV_KEYS[game]} must not include credentials`);
  }
  return url.origin;
}

/**
 * Game traffic is proxied by route handlers so the segment-prefetch header
 * survives. This rewrite is only the analytics script: `app/_vercel` would
 * be a private folder, and Pablo's canonical redirect would bounce the path
 * back onto the apex.
 */
export function hubRewrites(env: NodeJS.ProcessEnv = process.env) {
  const street = upstreamOrigin("street-tycoons", env);
  return [
    { source: "/_vercel/insights/:path*", destination: `${street}/_vercel/insights/:path*` },
  ];
}
