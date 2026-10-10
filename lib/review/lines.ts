import type { MoveClass, NodeEval, Side } from "./types";
import { mateWinningChances, moverCentipawns, toWhiteView, winningChances } from "./scores";

const GLYPH: Partial<Record<MoveClass, string>> = {
  inaccuracy: "?!",
  mistake: "?",
  blunder: "??",
};

/** NAG-style mark for a classified move. Sound moves stay unmarked. */
export function classGlyph(classification: MoveClass) {
  return GLYPH[classification] ?? "";
}

export function isWeakMove(classification: MoveClass) {
  return classification === "inaccuracy" || classification === "mistake" || classification === "blunder";
}

/**
 * Ply of the next or previous imprécision, erreur, or gaffe.
 * `fromPly` is the ply on the board (0 is the start). Null analyses are skipped.
 */
export function adjacentWeakPly(
  analyses: Array<{ classification: MoveClass } | null>,
  fromPly: number,
  direction: 1 | -1,
) {
  for (let ply = fromPly + direction; ply >= 1 && ply <= analyses.length; ply += direction) {
    const analysis = analyses[ply - 1];

    if (analysis && isWeakMove(analysis.classification)) {
      return ply;
    }
  }

  return null;
}

export type LineScore = {
  cp: number | null;
  mate: number | null;
};

export type LineSpread = {
  /** Centipawns the second line loses, from the side to move. */
  gap: number;
  /** Drop in winning chances, on the same −1…1 scale as move classification. */
  chanceDrop: number;
  /** Both lines are a forced mate for the side to move. */
  bothMates: boolean;
};

export type LineVerdict = "only" | "preferred" | "several";

/**
 * Compare the first two engine lines.
 * Returns null while the second line still outranks the first (search not settled).
 * An écart of 0.1 in winning chances is the same bar as an imprécision: below that,
 * a 2000 has a real choice. Two mating lines are not "a single move".
 */
export function lineSpread(best: LineScore, second: LineScore, side: Side): LineSpread | null {
  const bestEval = toWhiteView(best, side);
  const secondEval = toWhiteView(second, side);
  const rawGap = moverCentipawns(bestEval, side) - moverCentipawns(secondEval, side);

  if (rawGap < -15) {
    return null;
  }

  const bestMate = moverMate(bestEval, side);
  const secondMate = moverMate(secondEval, side);

  return {
    gap: Math.max(0, Math.round(rawGap)),
    chanceDrop: Math.max(0, moverChances(bestEval, side) - moverChances(secondEval, side)),
    bothMates: bestMate != null && bestMate > 0 && secondMate != null && secondMate > 0,
  };
}

export function verdictOf(spread: LineSpread): { kind: LineVerdict; text: string } {
  if (spread.bothMates) {
    return { kind: "several", text: "Plusieurs mats" };
  }

  if (spread.chanceDrop >= 0.1) {
    return { kind: "only", text: "Un seul coup tient" };
  }

  if (spread.chanceDrop >= 0.04) {
    return { kind: "preferred", text: "Un coup se détache" };
  }

  return { kind: "several", text: "Plusieurs coups jouables" };
}

export function formatLineGap(gap: number) {
  if (gap >= 5_000) {
    return "mat";
  }

  return (gap / 100).toFixed(2);
}

/** One sentence for the live lines, or null when two lines are not ready. */
export function describeSpread(best: LineScore, second: LineScore, side: Side) {
  const spread = lineSpread(best, second, side);

  if (!spread) {
    return null;
  }

  const verdict = verdictOf(spread);

  if (spread.bothMates || spread.gap <= 0) {
    return verdict.text;
  }

  return `${verdict.text} · écart ${formatLineGap(spread.gap)}`;
}

/** How far `other` trails `best`, in centipawns for the side to move. */
export function centipawnGap(best: LineScore, other: LineScore, side: Side) {
  const gap = moverCentipawns(toWhiteView(best, side), side) - moverCentipawns(toWhiteView(other, side), side);
  return Math.max(0, Math.round(gap));
}

function moverMate(evaluation: NodeEval, color: Side) {
  if (evaluation.mate == null) {
    return null;
  }

  return color === "w" ? evaluation.mate : -evaluation.mate;
}

function moverChances(evaluation: NodeEval, color: Side) {
  const mate = moverMate(evaluation, color);

  if (mate != null && mate !== 0) {
    return mateWinningChances(mate);
  }

  return winningChances(moverCentipawns(evaluation, color));
}
