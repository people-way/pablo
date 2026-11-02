/**
 * Remaining time from positions already finished.
 * Null until the first position returns, so a cold phone is not given a fake guess.
 */
export function remainingMillis(input: { done: number; total: number; elapsedMs: number }): number | null {
  if (input.done <= 0 || input.elapsedMs <= 0 || input.total <= 0) {
    return null;
  }

  if (input.done >= input.total) {
    return 0;
  }

  return Math.round((input.elapsedMs / input.done) * (input.total - input.done));
}

/** Short French label, or null when there is nothing left to wait for. */
export function formatEta(remainingMs: number | null): string | null {
  if (remainingMs === null) {
    return null;
  }

  if (remainingMs <= 0) {
    return null;
  }

  const seconds = Math.max(1, Math.round(remainingMs / 1000));

  if (seconds < 60) {
    return `encore ~${seconds} s`;
  }

  const minutes = Math.max(1, Math.round(seconds / 60));

  if (minutes < 60) {
    return `encore ~${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `encore ~${hours} h` : `encore ~${hours} h ${rest} min`;
}
