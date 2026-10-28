import { Chess } from "chess.js";
import { assessMove } from "@/lib/review/classify";
import { uciToSan } from "@/lib/review/parse";
import type { MoveClass, NodeEval, Side } from "@/lib/review/types";

export type ProbeHit = {
  ply: number;
  playedSan: string;
  bestSan: string | null;
  cpLoss: number;
  classification: Extract<MoveClass, "inaccuracy" | "mistake" | "blunder">;
};

export type PositionSearch = (
  fen: string,
  signal: AbortSignal,
) => Promise<{ bestUci: string | null; whiteEval: NodeEval } | null>;

const SIGNIFICANT: ProbeHit["classification"][] = ["inaccuracy", "mistake", "blunder"];

/**
 * Walk the user's moves and stop at the first significant eval drop.
 * The caller bounds depth, the number of lines, and the time budget.
 */
export async function findFirstInaccuracy(input: {
  sans: string[];
  user: Side;
  untilPly?: number;
  maxUserMoves?: number;
  signal?: AbortSignal;
  search: PositionSearch;
}): Promise<ProbeHit | null> {
  const signal = input.signal ?? new AbortController().signal;
  const until = input.untilPly ?? input.sans.length;
  const maxUserMoves = input.maxUserMoves ?? 6;
  const chess = new Chess();
  let looked = 0;

  for (let index = 0; index < input.sans.length && index < until; index += 1) {
    if (signal.aborted) {
      return null;
    }

    const fenBefore = chess.fen();
    let played;
    try {
      played = chess.move(input.sans[index]);
    } catch {
      return null;
    }
    if (!played) {
      return null;
    }

    if (played.color !== input.user) {
      continue;
    }

    looked += 1;
    if (looked > maxUserMoves) {
      return null;
    }

    const before = await input.search(fenBefore, signal);
    if (!before?.bestUci || signal.aborted) {
      continue;
    }

    const playedUci = `${played.from}${played.to}${played.promotion ?? ""}`;
    if (playedUci.toLowerCase() === before.bestUci.toLowerCase()) {
      continue;
    }

    const after = await input.search(chess.fen(), signal);
    if (!after || signal.aborted) {
      continue;
    }

    const assessed = assessMove({
      color: input.user,
      playedUci,
      bestUci: before.bestUci,
      before: before.whiteEval,
      after: after.whiteEval,
    });

    if (!SIGNIFICANT.includes(assessed.classification as ProbeHit["classification"])) {
      continue;
    }

    const bestSan = uciToSan(fenBefore, [before.bestUci])[0] ?? null;

    return {
      ply: index + 1,
      playedSan: played.san,
      bestSan,
      cpLoss: assessed.cpLoss,
      classification: assessed.classification as ProbeHit["classification"],
    };
  }

  return null;
}
