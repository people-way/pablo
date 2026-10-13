"use client";

import { useEffect, useRef } from "react";
import { activeVariation, moveCaption, variationLabel, type BoardVariation, type VariationTrail } from "@/lib/review/variations";

export function VariationStrip({
  trail,
  savedLines,
  returnLabel,
  onJump,
  onOpen,
  onReturn,
}: {
  trail: VariationTrail;
  savedLines: BoardVariation[];
  returnLabel: string | null;
  onJump: (cursor: number) => void;
  onOpen: (id: string) => void;
  onReturn: () => void;
}) {
  const line = activeVariation(trail);
  const listRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const node = activeRef.current;
    const list = listRef.current;

    if (!node || !list) {
      return;
    }

    const nodeRect = node.getBoundingClientRect();
    const listRect = list.getBoundingClientRect();

    if (nodeRect.left < listRect.left) {
      list.scrollLeft -= listRect.left - nodeRect.left;
    } else if (nodeRect.right > listRect.right) {
      list.scrollLeft += nodeRect.right - listRect.right;
    }
  }, [trail.activeId, trail.cursor]);

  if (line) {
    return (
      <div className="revue-explore flex min-w-0 flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold" style={{ color: "var(--gold)" }}>
            Variante · {trail.cursor}/{line.moves.length}
          </p>
          {returnLabel ? (
            <button
              type="button"
              className="min-h-11 shrink-0 rounded-lg px-3 text-sm"
              style={{ border: "1px solid var(--border)", color: "var(--text-primary)", background: "var(--bg-card)" }}
              onClick={onReturn}
            >
              {returnLabel}
            </button>
          ) : null}
        </div>
        <div
          ref={listRef}
          className="flex min-w-0 gap-1 overflow-x-auto pb-1"
          role="group"
          aria-label="Coups de la variante"
        >
          {line.moves.map((move, index) => {
            const current = index + 1 === trail.cursor;
            return (
              <button
                key={`${move.uci}-${index}`}
                type="button"
                ref={current ? activeRef : undefined}
                aria-current={current ? "step" : undefined}
                className="min-h-11 shrink-0 rounded-md px-2 text-sm font-medium"
                style={{
                  color: current ? "#0a0b0c" : index + 1 < trail.cursor ? "var(--text-primary)" : "var(--text-muted)",
                  background: current ? "var(--gold)" : "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                }}
                onClick={() => onJump(index + 1)}
              >
                {moveCaption(line.rootFen, line.moves, index)}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (savedLines.length === 0) {
    return null;
  }

  return (
    <div className="revue-explore flex min-w-0 flex-col gap-2">
      <p className="text-sm font-semibold" style={{ color: "var(--gold)" }}>
        {savedLines.length > 1 ? "Variantes" : "Variante"}
      </p>
      <div className="flex min-w-0 gap-2 overflow-x-auto pb-1" role="group" aria-label="Variantes enregistrées">
        {savedLines.map((item) => (
          <button
            key={item.id}
            type="button"
            className="min-h-11 shrink-0 rounded-lg px-3 text-left text-sm"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            onClick={() => onOpen(item.id)}
          >
            {variationLabel(item)}
          </button>
        ))}
      </div>
    </div>
  );
}
