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

export function hubRewrites(env: NodeJS.ProcessEnv = process.env) {
  const pablo = upstreamOrigin("pablo", env);
  const street = upstreamOrigin("street-tycoons", env);
  return [
    { source: "/pablo", destination: `${pablo}/pablo` },
    { source: "/pablo/:path*", destination: `${pablo}/pablo/:path*` },
    { source: "/street-tycoons", destination: `${street}/street-tycoons` },
    { source: "/street-tycoons/:path*", destination: `${street}/street-tycoons/:path*` },
  ];
}
