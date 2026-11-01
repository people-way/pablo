import { upstreamOrigin, type GameId } from "./upstreams";

const SEGMENT_MARKER = ".segments";
const SEGMENT_SUFFIX = ".segment.rsc";

export type ProxyKind = GameId | "insights";

export type ProxyTarget = {
  kind: ProxyKind;
  url: string;
  /** Segment path restored from a `.segments/...segment.rsc` URL, when the browser asked for the file path. */
  segment: string | null;
};

/**
 * Vercel's edge turns a segment prefetch (`next-router-segment-prefetch`)
 * into a lookup for `<route>.segments/<segment>.segment.rsc` before an
 * external rewrite runs. Those files are not real URLs on the game
 * deployments, so the prefetch 404s and the client reloads the whole page.
 * Asking the upstream for the page again, with the segment header, is the
 * request that already returns 200 when it is sent directly.
 */
export function restoreSegmentRequest(pathname: string): { pathname: string; segment: string } | null {
  if (!pathname.endsWith(SEGMENT_SUFFIX)) return null;
  const markerAt = pathname.lastIndexOf(SEGMENT_MARKER);
  if (markerAt < 0) return null;
  let page = pathname.slice(0, markerAt);
  const segment = pathname.slice(markerAt + SEGMENT_MARKER.length, -SEGMENT_SUFFIX.length);
  if (!segment.startsWith("/")) return null;
  if (!page.startsWith("/")) page = `/${page}`;

  const parts = page.split("/").filter(Boolean);
  // The index route is published as `/<mount>/<mount>.segments/...`.
  if (parts.length >= 2 && parts[parts.length - 1] === parts[0]) {
    page = `/${parts[0]}`;
  }
  return { pathname: page || "/", segment };
}

export function resolveProxyTarget(
  pathname: string,
  search = "",
  env: NodeJS.ProcessEnv = process.env,
): ProxyTarget | null {
  const restored = restoreSegmentRequest(pathname);
  const pagePath = restored?.pathname ?? pathname;
  const kind = kindForPath(pagePath);
  if (!kind) return null;

  const origin =
    kind === "insights" ? upstreamOrigin("street-tycoons", env) : upstreamOrigin(kind, env);
  const url = new URL(`${pagePath}${search}`, origin);
  return { kind, url: url.toString(), segment: restored?.segment ?? null };
}

function kindForPath(pathname: string): ProxyKind | null {
  if (pathname === "/pablo" || pathname.startsWith("/pablo/")) return "pablo";
  if (pathname === "/street-tycoons" || pathname.startsWith("/street-tycoons/")) return "street-tycoons";
  if (pathname === "/_vercel/insights" || pathname.startsWith("/_vercel/insights/")) return "insights";
  return null;
}
