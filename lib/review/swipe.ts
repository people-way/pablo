const MIN_DISTANCE_PX = 48;

/** Horizontal flick: finger moving left advances, finger moving right goes back. */
export function swipeDirection(dx: number, dy: number): -1 | 1 | null {
  if (Math.abs(dx) < MIN_DISTANCE_PX || Math.abs(dx) < Math.abs(dy) * 1.25) {
    return null;
  }

  return dx < 0 ? 1 : -1;
}
