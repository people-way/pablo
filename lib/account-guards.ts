/** Shared account helpers. No Next.js or Supabase imports — safe in node:test. */

export const AUTH_NEXT_COOKIE = "pablo_auth_next";

/** Only same-origin relative paths. Blocks open redirects. */
export function safeRedirectPath(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string") return fallback;
  let trimmed = value.trim();
  if (!trimmed) return fallback;
  try {
    trimmed = decodeURIComponent(trimmed);
  } catch {
    return fallback;
  }
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) return fallback;
  if (trimmed.includes("://") || trimmed.includes("\\")) return fallback;
  if (/[\u0000-\u001F]/.test(trimmed)) return fallback;
  if (/%2f|%5c/i.test(trimmed)) return fallback;
  return trimmed;
}

export function normalizeChessComUsername(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^[A-Za-z0-9_-]{3,25}$/.test(trimmed)) return null;
  return trimmed;
}
