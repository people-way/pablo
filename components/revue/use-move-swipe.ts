"use client";

import { useRef } from "react";
import { swipeDirection } from "@/lib/review/swipe";

export function useMoveSwipe(onStep: (direction: -1 | 1) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const consumed = useRef(false);

  return {
    onTouchStart(event: React.TouchEvent) {
      if (event.touches.length !== 1) {
        start.current = null;
        return;
      }

      const touch = event.touches[0];
      start.current = { x: touch.clientX, y: touch.clientY };
      consumed.current = false;
    },
    onTouchEnd(event: React.TouchEvent) {
      const origin = start.current;
      start.current = null;

      if (!origin) {
        return;
      }

      const touch = event.changedTouches[0];

      if (!touch) {
        return;
      }

      const direction = swipeDirection(touch.clientX - origin.x, touch.clientY - origin.y);

      if (direction === null) {
        return;
      }

      consumed.current = true;
      onStep(direction);
    },
    onClickCapture(event: React.MouseEvent) {
      if (!consumed.current) {
        return;
      }

      consumed.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };
}
