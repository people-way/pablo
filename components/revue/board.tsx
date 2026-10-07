"use client";

import { useState } from "react";
import { Chess, type Square } from "chess.js";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

const PIECE_NAME: Record<string, string> = {
  p: "pion",
  n: "cavalier",
  b: "fou",
  r: "tour",
  q: "dame",
  k: "roi",
};

type Promotion = {
  from: Square;
  to: Square;
};

export function ChessBoard({
  fen,
  orientation,
  lastMove,
  onPlay,
}: {
  fen: string;
  orientation: "w" | "b";
  lastMove: { from: Square; to: Square } | null;
  onPlay: (uci: string) => void;
}) {
  const [selected, setSelected] = useState<Square | null>(null);
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [trackedFen, setTrackedFen] = useState(fen);

  if (fen !== trackedFen) {
    setTrackedFen(fen);
    setSelected(null);
    setPromotion(null);
  }
  const chess = new Chess(fen);
  const ranks = chess.board();
  const display = orientation === "w" ? ranks : [...ranks].reverse().map((rank) => [...rank].reverse());
  const legal = selected ? chess.moves({ square: selected, verbose: true }) : [];
  const targets = new Set(legal.map((move) => move.to));
  const kingSquare = chess.inCheck()
    ? ranks.flat().find((piece) => piece?.type === "k" && piece.color === chess.turn())?.square
    : undefined;

  function choose(square: Square) {
    if (promotion) {
      return;
    }

    if (selected && targets.has(square)) {
      const promotions = legal.filter((move) => move.to === square && move.promotion);

      if (promotions.length > 0) {
        setPromotion({ from: selected, to: square });
        return;
      }

      const move = legal.find((candidate) => candidate.to === square);
      if (move) {
        onPlay(`${move.from}${move.to}${move.promotion ?? ""}`);
      }
      setSelected(null);
      return;
    }

    const piece = chess.get(square);

    if (piece && piece.color === chess.turn()) {
      setSelected(square);
      return;
    }

    setSelected(null);
  }

  function promote(piece: string) {
    if (!promotion) {
      return;
    }

    onPlay(`${promotion.from}${promotion.to}${piece}`);
    setPromotion(null);
    setSelected(null);
  }

  return (
    <div className="relative w-full">
      <div
        className="grid aspect-square w-full overflow-hidden rounded-lg border"
        style={{
          gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
          gridTemplateRows: "repeat(8, minmax(0, 1fr))",
          borderColor: "var(--border)",
        }}
      >
        {display.map((rank, row) =>
          rank.map((piece, col) => {
            const fileIndex = orientation === "w" ? col : 7 - col;
            const rankIndex = orientation === "w" ? 7 - row : row;
            const square = `${FILES[fileIndex]}${rankIndex + 1}` as Square;
            const dark = (fileIndex + rankIndex) % 2 === 0;
            const isLast = lastMove?.from === square || lastMove?.to === square;
            const isSelected = selected === square;
            const isTarget = targets.has(square);
            const isCheck = kingSquare === square;
            const label = piece
              ? `${PIECE_NAME[piece.type]} ${piece.color === "w" ? "blanc" : "noir"}, ${square}`
              : square;

            return (
              <button
                key={square}
                type="button"
                aria-label={label}
                onClick={() => choose(square)}
                className="relative flex items-center justify-center"
                style={{
                  background: isCheck
                    ? "#a33b3b"
                    : isSelected
                      ? "#f0d78c"
                      : isLast
                        ? dark
                          ? "#c4a15a"
                          : "#f3e2b0"
                        : dark
                          ? "#b58863"
                          : "#f0d9b5",
                }}
              >
                {piece ? (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-[7%] select-none bg-contain bg-center bg-no-repeat"
                    style={{
                      backgroundImage: `url(/pieces/cburnett/${piece.color}${piece.type.toUpperCase()}.svg)`,
                    }}
                  />
                ) : null}
                {isTarget ? (
                  <span
                    className="pointer-events-none absolute rounded-full"
                    style={{
                      width: piece ? "86%" : "28%",
                      height: piece ? "86%" : "28%",
                      border: piece ? "3px solid rgba(20, 16, 10, 0.45)" : undefined,
                      background: piece ? "transparent" : "rgba(20, 16, 10, 0.35)",
                    }}
                  />
                ) : null}
                {row === 7 ? (
                  <span
                    className="pointer-events-none absolute bottom-0.5 right-0.5 text-[10px] font-semibold leading-none"
                    style={{ color: dark ? "#f0d9b5" : "#6b4a2b" }}
                  >
                    {FILES[fileIndex]}
                  </span>
                ) : null}
                {col === 0 ? (
                  <span
                    className="pointer-events-none absolute left-0.5 top-0.5 text-[10px] font-semibold leading-none"
                    style={{ color: dark ? "#f0d9b5" : "#6b4a2b" }}
                  >
                    {rankIndex + 1}
                  </span>
                ) : null}
              </button>
            );
          }),
        )}
      </div>
      {promotion ? (
        <div
          className="absolute inset-x-0 top-2 z-10 mx-auto flex w-fit gap-2 rounded-xl p-2"
          style={{ background: "rgba(10,11,12,0.92)", border: "1px solid var(--border-gold)" }}
        >
          {["q", "r", "b", "n"].map((piece) => (
            <button
              key={piece}
              type="button"
              className="h-12 w-12 rounded-lg"
              style={{ background: "#f0d9b5" }}
              onClick={() => promote(piece)}
              aria-label={`Promouvoir en ${PIECE_NAME[piece]}`}
            >
              <span
                aria-hidden="true"
                className="mx-auto block h-10 w-10 bg-contain bg-center bg-no-repeat"
                style={{ backgroundImage: `url(/pieces/cburnett/${chess.turn()}${piece.toUpperCase()}.svg)` }}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
