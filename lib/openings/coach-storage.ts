import type { ProbeHit } from "@/lib/openings/probe";
import type { RepertoireReport } from "@/lib/openings/repertoire-types";

const STORAGE_KEY = "pablo-opening-coach-v2";
export const COACH_CACHE_MS = 6 * 60 * 60 * 1000;

export type CoachCache = {
  version: 1;
  username: string;
  months: number;
  savedAt: string;
  report: RepertoireReport;
  probes: Record<string, ProbeHit | null>;
};

export function readCoachCache(): CoachCache | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as CoachCache;
    if (parsed?.version !== 1 || !parsed.report || !parsed.username) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeCoachCache(cache: CoachCache) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // A full quota should not block the report on screen.
  }
}

export function cacheIsFresh(cache: CoachCache, now = Date.now()) {
  const saved = Date.parse(cache.savedAt);
  return Number.isFinite(saved) && now - saved < COACH_CACHE_MS;
}
