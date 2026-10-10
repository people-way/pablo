"use client";

import { useEffect, useRef } from "react";
import type { MoveAnalysis, MoveClass, NodeEval, ParsedMove, Side } from "@/lib/review/types";
import { classLabel } from "@/lib/review/classify";
import { formatEval, whiteBarShare } from "@/lib/review/scores";

const CLASS_COLOR: Record<MoveClass, string> = {
  best: "#7dcea0",
  good: "#8ce0ac",
  ok: "#c8c0b4",
  inaccuracy: "#e8c870",
  mistake: "#e88844",
  blunder: "#e85555",
};

export function classColor(classification: MoveClass) {
  return CLASS_COLOR[classification];
}

export function EvalBar({
  evaluation,
  orientation = "w",
}: {
  evaluation: NodeEval | null;
  orientation?: Side;
}) {
  const share = evaluation ? whiteBarShare(evaluation.cp) : 0.5;
  const label = evaluation ? formatEval(evaluation) : "…";
  const whiteFromBottom = orientation === "w";

  return (
    <div
      className="flex w-7 shrink-0 flex-col items-center self-stretch sm:w-9"
      aria-label={`Évaluation ${label}, du point de vue des blancs`}
    >
      <div
        className="relative min-h-0 w-full flex-1 overflow-hidden rounded-md"
        style={{ background: "#1c140f", border: "1px solid var(--border)" }}
      >
        <div
          className="absolute inset-x-0"
          style={{
            height: `${Math.round(share * 1000) / 10}%`,
            background: "#f4efe6",
            bottom: whiteFromBottom ? 0 : undefined,
            top: whiteFromBottom ? undefined : 0,
          }}
        />
      </div>
      <div className="mt-1 text-center text-[10px] font-semibold leading-tight" style={{ color: "var(--gold-light)" }}>
        {label}
      </div>
    </div>
  );
}

export function EvalChart({
  evals,
  ply,
  onPick,
}: {
  evals: Array<NodeEval | null>;
  ply: number;
  onPick: (ply: number) => void;
}) {
  const known = evals.findIndex((evaluation) => evaluation == null);
  const count = known === -1 ? evals.length : known;

  if (count < 2) {
    return (
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        La courbe se dessine pendant l&apos;analyse.
      </p>
    );
  }

  const width = 320;
  const height = 96;
  const points = evals.slice(0, count).map((evaluation, index) => {
    const share = whiteBarShare(evaluation?.cp ?? 0);
    const x = (index / (count - 1)) * width;
    const y = height - share * height;
    return `${x},${y}`;
  });

  return (
    <button
      type="button"
      className="w-full"
      aria-label="Courbe d'évaluation, cliquer pour aller au coup"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const ratio = (event.clientX - rect.left) / rect.width;
        const next = Math.round(Math.min(1, Math.max(0, ratio)) * (count - 1));
        onPick(next);
      }}
    >
      <svg viewBox={`0 0 ${width} ${height}`} className="h-24 w-full">
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#3d3428" strokeWidth="1" />
        <polyline fill="none" stroke="#c9a84c" strokeWidth="2.5" points={points.join(" ")} />
        {evals[ply] && ply < count ? (
          <circle
            cx={(ply / (count - 1)) * width}
            cy={height - whiteBarShare(evals[ply]?.cp ?? 0) * height}
            r="4.5"
            fill="#f0ede8"
          />
        ) : null}
      </svg>
    </button>
  );
}

export function MoveList({
  moves,
  analyses,
  ply,
  exploring,
  onPick,
}: {
  moves: ParsedMove[];
  analyses: Array<MoveAnalysis | null>;
  ply: number;
  exploring: boolean;
  onPick: (ply: number) => void;
}) {
  const rows: Array<{ number: number; white?: ParsedMove; black?: ParsedMove }> = [];

  for (let index = 0; index < moves.length; index += 2) {
    rows.push({
      number: Math.floor(index / 2) + 1,
      white: moves[index],
      black: moves[index + 1],
    });
  }

  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [ply, exploring]);

  return (
    <ol className="max-h-72 space-y-1 overflow-y-auto pr-1 text-sm">
      {rows.map((row) => (
        <li key={row.number} className="grid grid-cols-[2rem_1fr_1fr] items-center gap-1">
          <span style={{ color: "var(--text-muted)" }}>{row.number}.</span>
          <MoveButton move={row.white} analysis={row.white ? analyses[row.white.ply - 1] : null} active={!exploring && ply === row.white?.ply} onPick={onPick} activeRef={activeRef} />
          <MoveButton move={row.black} analysis={row.black ? analyses[row.black.ply - 1] : null} active={!exploring && ply === row.black?.ply} onPick={onPick} activeRef={activeRef} />
        </li>
      ))}
    </ol>
  );
}

function MoveButton({
  move,
  analysis,
  active,
  onPick,
  activeRef,
}: {
  move?: ParsedMove;
  analysis: MoveAnalysis | null;
  active: boolean;
  onPick: (ply: number) => void;
  activeRef: { current: HTMLButtonElement | null };
}) {
  if (!move) {
    return <span />;
  }

  return (
    <button
      type="button"
      ref={active ? activeRef : undefined}
      onClick={() => onPick(move.ply)}
      className="min-h-10 rounded-md px-2 py-1 text-left font-medium"
      style={{
        color: analysis ? classColor(analysis.classification) : "var(--text-primary)",
        background: active ? "rgba(201,168,76,0.16)" : "transparent",
      }}
      title={analysis ? classLabel(analysis.classification) : undefined}
    >
      {move.san}
    </button>
  );
}
