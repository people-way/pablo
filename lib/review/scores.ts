import { Chess } from "chess.js";
import type { NodeEval, Side } from "./types";

const MATE_CP = 100_000;

export function sideToMove(fen: string): Side {
  return fen.split(" ")[1] === "b" ? "b" : "w";
}

export function toWhiteView(
  score: { cp: number | null; mate: number | null },
  side: Side,
): NodeEval {
  const sign = side === "w" ? 1 : -1;

  if (score.mate != null && score.mate !== 0) {
    const mate = sign * score.mate;
    const magnitude = MATE_CP - Math.min(Math.abs(score.mate), 80);
    return {
      cp: mate > 0 ? magnitude : -magnitude,
      mate,
    };
  }

  return {
    cp: sign * (score.cp ?? 0),
    mate: null,
  };
}

/** Eval of a position the engine should not search (mate or draw). */
export function terminalEval(fen: string): NodeEval | null {
  let chess: Chess;

  try {
    chess = new Chess(fen);
  } catch {
    return null;
  }

  if (chess.isCheckmate()) {
    const mated = chess.turn();
    return {
      cp: mated === "w" ? -MATE_CP : MATE_CP,
      mate: null,
    };
  }

  if (chess.isDraw()) {
    return { cp: 0, mate: null };
  }

  return null;
}

export function moverCentipawns(evaluation: NodeEval, color: Side) {
  return color === "w" ? evaluation.cp : -evaluation.cp;
}

/** Lichess winning chances, from -1 (lost) to 1 (won). Mate scores stay above any pawn eval. */
export function rawWinningChances(cp: number) {
  return 2 / (1 + Math.exp(-0.00368208 * cp)) - 1;
}

export function winningChances(cp: number) {
  return rawWinningChances(Math.max(-1000, Math.min(1000, cp)));
}

export function mateWinningChances(mate: number) {
  const magnitude = (21 - Math.min(10, Math.abs(mate))) * 100;
  return rawWinningChances(magnitude * Math.sign(mate));
}

/** Win chance for a centipawn score, 0–100. Values beyond ±10 pawns are capped. */
export function winPercent(cp: number) {
  return 50 + 50 * winningChances(cp);
}

/**
 * Approximate move accuracy from the change in winning chances.
 * A zero-loss move scores 100. The curve matches the public Lichess fit.
 */
export function accuracyFromWinLoss(winLoss: number) {
  const loss = Math.max(0, winLoss);
  const raw = 103.1668 * Math.exp(-0.04354 * loss) - 3.1669;
  return Math.max(0, Math.min(100, raw));
}

export function moveAccuracy(before: NodeEval, after: NodeEval, color: Side) {
  const winBefore = winPercent(moverCentipawns(before, color));
  const winAfter = winPercent(moverCentipawns(after, color));
  return accuracyFromWinLoss(winBefore - winAfter);
}

/** Pawns lost, or "mat" when the swing is a mating net rather than a normal eval. */
export function formatCentipawnLoss(cpLoss: number) {
  if (cpLoss >= 5_000) {
    return "mat";
  }

  return `-${(cpLoss / 100).toFixed(2)}`;
}

export function formatEval(evaluation: NodeEval) {
  if (Math.abs(evaluation.cp) >= MATE_CP && evaluation.mate == null) {
    return evaluation.cp > 0 ? "+Mat" : "-Mat";
  }

  if (evaluation.mate != null) {
    const sign = evaluation.mate > 0 ? "+" : "-";
    return `${sign}M${Math.abs(evaluation.mate)}`;
  }

  const pawns = Math.round(evaluation.cp) / 100;

  if (Math.abs(pawns) < 0.05) {
    return "0.0";
  }

  const sign = pawns > 0 ? "+" : "-";
  return `${sign}${Math.abs(pawns).toFixed(1)}`;
}

/** Share of the eval bar occupied by White, from 0 to 1. */
export function whiteBarShare(cp: number) {
  return winPercent(cp) / 100;
}
