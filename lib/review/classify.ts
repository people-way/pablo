import type { MoveClass, NodeEval, PlayerSummary, Side } from "./types";
import {
  accuracyFromWinLoss,
  mateWinningChances,
  moverCentipawns,
  winningChances,
} from "./scores";

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
 * Ordinary swings use the Lichess winning-chance curve (about 55 / 110 / 170
 * centipawns from an equal position): imprécision ≥ 0.1, erreur ≥ 0.2, gaffe ≥ 0.3.
 * Dropping a forced mate while still clearly winning is an imprécision or an
 * erreur, not a gaffe of ninety pawns. The engine's first choice stays a best
 * move so a second search at the same depth does not invent a mistake.
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

  const beforeCp = moverCentipawns(input.before, input.color);
  const afterCp = moverCentipawns(input.after, input.color);
  const cpLoss = Math.max(0, Math.round(clampCp(beforeCp) - clampCp(afterCp)));
  const chanceDrop = moverChances(input.before, input.color) - moverChances(input.after, input.color);
  const accuracy = Number(accuracyFromWinLoss(chanceDrop * 50).toFixed(1));
  const fromMate = mateSwing(input.before, input.after, input.color, beforeCp, afterCp);

  if (fromMate) {
    return { classification: fromMate, cpLoss, accuracy };
  }

  if (cpLoss === 0) {
    return { classification: "best", cpLoss: 0, accuracy: 100 };
  }

  return {
    classification: classifyChanceDrop(chanceDrop, cpLoss),
    cpLoss,
    accuracy,
  };
}

function classifyChanceDrop(chanceDrop: number, cpLoss: number): MoveClass {
  if (chanceDrop >= 0.3) {
    return "blunder";
  }

  if (chanceDrop >= 0.2) {
    return "mistake";
  }

  if (chanceDrop >= 0.1) {
    return "inaccuracy";
  }

  if (cpLoss <= 20) {
    return "good";
  }

  return "ok";
}

function mateSwing(
  before: NodeEval,
  after: NodeEval,
  color: Side,
  beforeCp: number,
  afterCp: number,
): MoveClass | null {
  const beforeMate = moverMate(before, color);
  const afterMate = moverMate(after, color);
  const hadMate = beforeMate != null && beforeMate > 0;
  const keptMate = afterMate != null && afterMate > 0;
  const allowedMate = afterMate != null && afterMate < 0 && !(beforeMate != null && beforeMate < 0);

  if (hadMate && !keptMate) {
    if (afterCp > 999) {
      return "inaccuracy";
    }

    if (afterCp > 700) {
      return "mistake";
    }

    return "blunder";
  }

  if (allowedMate) {
    if (beforeCp < -999) {
      return "inaccuracy";
    }

    if (beforeCp < -700) {
      return "mistake";
    }

    return "blunder";
  }

  return null;
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

function clampCp(cp: number) {
  return Math.max(-1000, Math.min(1000, cp));
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
