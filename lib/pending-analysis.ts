import { isSampleUsername } from "@/lib/sample-games";

const STORAGE_KEY = "pablo.pendingAnalysis";
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

type PendingAnalysis = {
  result: unknown;
  chessUsername: string;
  sample?: boolean;
  stashedAt: number;
};

export function stashPendingAnalysis(input: {
  result: unknown;
  chessUsername: string;
  sample?: boolean;
}): void {
  if (typeof window === "undefined") return;
  if (input.sample || isSampleUsername(input.chessUsername)) return;
  const payload: PendingAnalysis = {
    result: input.result,
    chessUsername: input.chessUsername,
    sample: false,
    stashedAt: Date.now(),
  };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export async function flushPendingAnalysis(): Promise<"saved" | "empty" | "skipped" | "failed"> {
  if (typeof window === "undefined") return "empty";
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return "empty";

  let pending: PendingAnalysis;
  try {
    pending = JSON.parse(raw) as PendingAnalysis;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return "skipped";
  }

  const expired = Date.now() - pending.stashedAt > MAX_AGE_MS;
  const sample =
    pending.sample === true ||
    typeof pending.chessUsername !== "string" ||
    isSampleUsername(pending.chessUsername);
  if (expired || sample || !pending.result) {
    sessionStorage.removeItem(STORAGE_KEY);
    return "skipped";
  }

  try {
    const response = await fetch("/api/analyses/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        result: pending.result,
        chessUsername: pending.chessUsername,
        sample: false,
      }),
    });
    if (response.status === 401) return "failed";
    if (!response.ok) {
      sessionStorage.removeItem(STORAGE_KEY);
      return "failed";
    }
    sessionStorage.removeItem(STORAGE_KEY);
    return "saved";
  } catch {
    return "failed";
  }
}
