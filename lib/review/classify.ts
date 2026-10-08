import type { MoveClass, NodeEval, PlayerSummary, Side } from "./types";
import { accuracyFromWinLoss, moverCentipawns, winPercent } from "./scores";

const CLASS_LABEL: Record<MoveClass, string> = {
  best: "Meilleur coup",
  good: "Bon coup",
  ok: "Coup correct",
  inaccuracy: "Imprécision",
  mistake: "Erreur",
  blunder: "Gaffe",
};

export function classLabel(classification: MoveClass) {
  return CLASS_LABEL[classification];
}

export function sameUci(left: string | null, right: string | null) {
  if (!left || !right) {
    return false;
  }

  return left.toLowerCase() === right.toLowerCase();
}

/**
 * Classify a played move against the engine choice.
 * Thresholds, in centipawns lost from the mover's point of view:
 * imprécision ≥ 50, erreur ≥ 100, gaffe ≥ 200.
 * The engine's first choice is treated as a best move (loss 0) so a second
 * search at the same depth does not invent a mistake.
 */
export function assessMove(input: {
  color: Side;
  playedUci: string;
  bestUci: string | null;
  before: NodeEval;
  after: NodeEval;
}): { classification: MoveClass; cpLoss: number; accuracy: number } {
  if (sameUci(input.playedUci, input.bestUci)) {
    return { classification: "best", cpLoss: 0, accuracy: 100 };
  }

  const before = moverCentipawns(input.before, input.color);
  const after = moverCentipawns(input.after, input.color);
  const cpLoss = Math.max(0, Math.round(before - after));
  const accuracy = Number(
    accuracyFromWinLoss(winPercent(before) - winPercent(after)).toFixed(1),
  );

  if (cpLoss === 0) {
    return { classification: "best", cpLoss: 0, accuracy: 100 };
  }

  return {
    classification: classifyCentipawnLoss(cpLoss),
    cpLoss,
    accuracy,
  };
}

export function classifyCentipawnLoss(cpLoss: number): MoveClass {
  if (cpLoss >= 200) {
    return "blunder";
  }

  if (cpLoss >= 100) {
    return "mistake";
  }

  if (cpLoss >= 50) {
    return "inaccuracy";
  }

  if (cpLoss <= 20) {
    return "good";
  }

  return "ok";
}

export function summarizePlayer(
  moves: Array<{ color: Side; classification: MoveClass; cpLoss: number; accuracy: number }>,
  color: Side,
): PlayerSummary {
  const own = moves.filter((move) => move.color === color);
  const count = (classification: MoveClass) =>
    own.filter((move) => move.classification === classification).length;

  if (own.length === 0) {
    return {
      color,
      moves: 0,
      blunders: 0,
      mistakes: 0,
      inaccuracies: 0,
      best: 0,
      good: 0,
      accuracy: null,
      acpl: null,
    };
  }

  const accuracy =
    own.reduce((total, move) => total + move.accuracy, 0) / own.length;
  const acpl = own.reduce((total, move) => total + move.cpLoss, 0) / own.length;

  return {
    color,
    moves: own.length,
    blunders: count("blunder"),
    mistakes: count("mistake"),
    inaccuracies: count("inaccuracy"),
    best: count("best"),
    good: count("good"),
    accuracy: Number(accuracy.toFixed(1)),
    acpl: Number(acpl.toFixed(1)),
  };
}

function plural(count: number, singular: string, pluralLabel: string) {
  return `${count} ${count === 1 ? singular : pluralLabel}`;
}

export function summaryText(summary: PlayerSummary) {
  const name = summary.color === "w" ? "Blanc" : "Noir";

  if (summary.moves === 0 || summary.accuracy == null) {
    return `${name} — aucun coup analysé`;
  }

  return [
    `${name} — précision ${Math.round(summary.accuracy)} %`,
    plural(summary.blunders, "gaffe", "gaffes"),
    plural(summary.mistakes, "erreur", "erreurs"),
    plural(summary.inaccuracies, "imprécision", "imprécisions"),
  ].join(" · ");
}
