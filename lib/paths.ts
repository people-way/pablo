/**
 * Pablo is served under this prefix on every host, including the studio hub.
 * `basePath` in next.config.ts must stay equal to BASE_PATH.
 */
export const BASE_PATH = "/pablo";

/** Public studio origin. Empty means "stay on the host that received the request". */
export function canonicalOrigin(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env.PABLO_CANONICAL_ORIGIN?.trim() ?? "";
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.origin;
  } catch {
    return "";
  }
}

export function metadataBaseUrl(env: NodeJS.ProcessEnv = process.env): URL {
  const canonical = canonicalOrigin(env);
  if (canonical) return new URL(`${BASE_PATH}/`, `${canonical}/`);
  const vercel = env.VERCEL_URL?.trim();
  if (vercel) return new URL(`${BASE_PATH}/`, `https://${vercel}/`);
  const port = env.PORT?.trim() || "3000";
  return new URL(`${BASE_PATH}/`, `http://localhost:${port}/`);
}

/** Prefix an in-app path. Query and hash are preserved. */
export function withBasePath(path: string): string {
  const { pathname, query, hash } = splitPath(path);
  if (!pathname.startsWith("/")) {
    throw new Error(`withBasePath expects an absolute path, received "${path}"`);
  }
  const prefixed =
    pathname === BASE_PATH || pathname.startsWith(`${BASE_PATH}/`)
      ? pathname
      : `${BASE_PATH}${pathname === "/" ? "" : pathname}`;
  return `${prefixed}${query}${hash}`;
}

/** Remove one leading base prefix so Next's own basePath is not applied twice. */
export function stripBasePath(value: string): string {
  const { pathname, query, hash } = splitPath(value);
  let next = pathname;
  if (pathname === BASE_PATH) next = "/";
  else if (pathname.startsWith(`${BASE_PATH}/`)) next = pathname.slice(BASE_PATH.length) || "/";
  return `${next}${query}${hash}`;
}

/**
 * Old root URLs (`/`, `/revue`) on the Pablo deployment. Paths already under
 * `/pablo` are not listed: the hub rewrites those back here, and redirecting
 * them would loop. `/sw.js` is served in place so an installed worker can
 * unregister itself.
 */
export function legacyRedirects(origin = canonicalOrigin()): Array<{
  source: string;
  destination: string;
  permanent: false;
  basePath: false;
}> {
  const root = `${origin}${BASE_PATH}`;
  return [
    {
      source: "/",
      destination: root,
      permanent: false,
      basePath: false,
    },
    {
      source: "/:path((?!pablo(?:/|$)|sw\\.js$).*)",
      destination: `${root}/:path`,
      permanent: false,
      basePath: false,
    },
  ];
}

export function applyCanonicalHost(url: { protocol: string; host: string }): void {
  const origin = canonicalOrigin();
  if (!origin) return;
  const target = new URL(origin);
  url.protocol = target.protocol;
  url.host = target.host;
}

function splitPath(path: string): { pathname: string; query: string; hash: string } {
  const hashAt = path.indexOf("#");
  const hash = hashAt === -1 ? "" : path.slice(hashAt);
  const beforeHash = hashAt === -1 ? path : path.slice(0, hashAt);
  const queryAt = beforeHash.indexOf("?");
  const query = queryAt === -1 ? "" : beforeHash.slice(queryAt);
  const pathname = queryAt === -1 ? beforeHash : beforeHash.slice(0, queryAt);
  return { pathname, query, hash };
}
