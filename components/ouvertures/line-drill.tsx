"use client";

import { useMemo, useState } from "react";
import { Chess } from "chess.js";
import type { Square } from "chess.js";
import { ChessBoard } from "@/components/revue/board";

export function LineDrill({
  title,
  idea,
  replaySans,
  setupSans,
  quizSan,
  orientation,
  playedSan,
}: {
  title: string;
  idea: string;
  replaySans: string[];
  setupSans: string[];
  quizSan: string | null;
  orientation: "w" | "b";
  playedSan: string;
}) {
  const [mode, setMode] = useState<"replay" | "quiz">(quizSan ? "quiz" : "replay");
  const [ply, setPly] = useState(quizSan ? setupSans.length : 0);
  const [found, setFound] = useState(false);
  const [missed, setMissed] = useState(false);
  const [note, setNote] = useState(quizSan ? `À toi. Dans tes parties, le coup a été ${playedSan}.` : "Rejoue la ligne coup par coup.");

  const solvedLine = found && quizSan ? [...setupSans, quizSan] : null;
  const line = solvedLine ?? (mode === "quiz" ? setupSans : replaySans);
  const shownPly = solvedLine ? solvedLine.length : mode === "quiz" ? Math.min(ply, setupSans.length) : ply;
  const position = useMemo(() => replay(line, shownPly), [line, shownPly]);
  const interactive = mode === "quiz" && !found && shownPly === setupSans.length;
  const hint = missed && quizSan ? sanToUci(position.fen, quizSan) : null;

  function jump(next: number) {
    setMode("replay");
    setFound(false);
    setMissed(false);
    setPly(Math.max(0, Math.min(replaySans.length, next)));
    setNote("Rejoue la ligne coup par coup.");
  }

  function startQuiz() {
    if (!quizSan) {
      jump(0);
      return;
    }
    setMode("quiz");
    setFound(false);
    setMissed(false);
    setPly(setupSans.length);
    setNote(`À toi. Dans tes parties, le coup a été ${playedSan}.`);
  }

  function onPlay(uci: string) {
    if (!interactive || !quizSan) {
      return;
    }
    const chess = new Chess(position.fen);
    let move;
    try {
      move = chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci[4],
      });
    } catch {
      return;
    }
    if (!move) {
      return;
    }
    if (move.san === quizSan) {
      setFound(true);
      setMissed(false);
      setNote(`Oui. ${quizSan}. ${idea}`);
      return;
    }
    setMissed(true);
    setNote(`Non. Le coup, c'est ${quizSan}.`);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
      <ChessBoard
        fen={position.fen}
        orientation={orientation}
        lastMove={position.lastMove}
        bestMove={hint}
        interactive={interactive}
        onPlay={onPlay}
      />
      <div className="flex flex-col gap-3">
        <h3 className="text-xl" style={{ fontFamily: "var(--font-playfair), serif", color: "var(--gold-light)" }}>
          {title}
        </h3>
        <p className="text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
          {note}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="min-h-11 rounded-lg px-3 text-sm" style={ghost} onClick={() => jump(0)}>
            Début
          </button>
          <button type="button" className="min-h-11 rounded-lg px-3 text-sm" style={ghost} onClick={() => jump(shownPly - 1)}>
            Précédent
          </button>
          <button
            type="button"
            className="min-h-11 rounded-lg px-3 text-sm"
            style={ghost}
            onClick={() => jump(shownPly + 1)}
          >
            Suivant
          </button>
          <button type="button" className="min-h-11 rounded-lg px-3 text-sm" style={ghost} onClick={() => jump(replaySans.length)}>
            Fin
          </button>
          {quizSan ? (
            <button type="button" className="btn-gold min-h-11 rounded-lg px-3 text-sm font-bold" style={{ color: "#0a0b0c" }} onClick={startQuiz}>
              Trouver le coup
            </button>
          ) : null}
        </div>
        <ol className="flex flex-wrap gap-1.5">
          {replaySans.map((san, index) => {
            const moveNumber = Math.floor(index / 2) + 1;
            const label = index % 2 === 0 ? `${moveNumber}. ${san}` : san;
            const current = mode === "replay" && index === shownPly - 1;
            return (
              <li key={`${san}-${index}`}>
                <button
                  type="button"
                  className="min-h-11 rounded-md px-2 text-sm"
                  style={{
                    background: current ? "rgba(201,168,76,0.18)" : "transparent",
                    color: current ? "var(--gold-light)" : "var(--text-secondary)",
                    border: "1px solid var(--border)",
                  }}
                  onClick={() => jump(index + 1)}
                >
                  {label}
                </button>
              </li>
            );
          })}
        </ol>
        {found ? (
          <p className="text-sm leading-6" style={{ color: "var(--text-primary)" }}>
            {idea}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function replay(sans: string[], ply: number) {
  const chess = new Chess();
  let lastMove: { from: Square; to: Square } | null = null;
  const stop = Math.max(0, Math.min(ply, sans.length));

  for (let index = 0; index < stop; index += 1) {
    try {
      const move = chess.move(sans[index]);
      if (!move) {
        break;
      }
      lastMove = { from: move.from, to: move.to };
    } catch {
      break;
    }
  }

  return { fen: chess.fen(), lastMove };
}

function sanToUci(fen: string, san: string) {
  const chess = new Chess(fen);
  try {
    const move = chess.move(san);
    return move ? `${move.from}${move.to}${move.promotion ?? ""}` : null;
  } catch {
    return null;
  }
}

const ghost = {
  border: "1px solid var(--border)",
  color: "var(--text-secondary)",
};
