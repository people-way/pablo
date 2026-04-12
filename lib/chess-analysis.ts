import { Chess, type Move, type PieceSymbol } from "chess.js";

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 100,
};

const MATE_SEARCH_BUDGET = 16000;

type GamePhase = "opening" | "middlegame" | "endgame";
type BlunderMotif = "mate" | "material";
type InternalColor = "w" | "b";

export type AnalysisPerspective = "white" | "black";

export type AnalysisBlunder = {
  move_number: number;
  move: string;
  description: string;
};

export type GameAnalysisReport = {
  total_moves: number;
  blunders: AnalysisBlunder[];
  summary: string;
};

type InternalBlunder = AnalysisBlunder & {
  severity: number;
  phase: GamePhase;
  motif: BlunderMotif;
};

export class ChessAnalysisError extends Error {
  code: string;
  status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.name = "ChessAnalysisError";
    this.code = code;
    this.status = status;
  }
}

export function analyzePgn(
  rawPgn: string,
  perspective?: AnalysisPerspective,
): GameAnalysisReport {
  const pgn = rawPgn.trim();

  if (!pgn) {
    throw new ChessAnalysisError("missing_pgn", 400, "Provide a PGN string.");
  }

  const game = new Chess();

  try {
    game.loadPgn(pgn);
  } catch {
    throw new ChessAnalysisError(
      "invalid_pgn",
      400,
      "The provided PGN could not be parsed.",
    );
  }

  const moves = game.history({ verbose: true });

  if (moves.length === 0) {
    throw new ChessAnalysisError(
      "empty_game",
      400,
      "The PGN parsed, but it does not contain any moves.",
    );
  }

  const normalizedPerspective = normalizePerspective(perspective);
  const searchBudget = { remaining: MATE_SEARCH_BUDGET };
  const blunders: InternalBlunder[] = [];

  for (const [index, move] of moves.entries()) {
    if (normalizedPerspective && move.color !== normalizedPerspective) {
      continue;
    }

    const before = new Chess(move.before);
    const after = new Chess(move.after);
    const moveNumber = Math.floor(index / 2) + 1;
    const phase = determinePhase(moveNumber);
    const findings: Array<{
      description: string;
      severity: number;
      motif: BlunderMotif;
    }> = [];

    const mateInOne = findMateInOneMoves(before, searchBudget);
    if (mateInOne.length > 0 && !matchesMove(move, mateInOne)) {
      findings.push({
        description: `You missed checkmate in 1. The win was ${formatWinningLine(mateInOne)}.`,
        severity: 100,
        motif: "mate",
      });
    } else if (mateInOne.length === 0) {
      const mateInTwo = findMateInTwoMoves(before, searchBudget);
      if (mateInTwo.length > 0 && !matchesMove(move, mateInTwo)) {
        findings.push({
          description: `You missed a forced mate in 2. The attack starts with ${formatWinningLine(mateInTwo)}.`,
          severity: 78,
          motif: "mate",
        });
      }
    }

    const opponentMate = findMateInOneMoves(after, searchBudget);
    if (opponentMate.length > 0) {
      findings.push({
        description: `This allows mate in 1 with ${formatWinningLine(opponentMate)}.`,
        severity: 96,
        motif: "mate",
      });
    }

    const materialBlunder = findMaterialBlunder(after);
    if (materialBlunder) {
      findings.push(materialBlunder);
    }

    if (findings.length === 0) {
      continue;
    }

    findings.sort((left, right) => right.severity - left.severity);
    const topFindings = findings.slice(0, 2);

    blunders.push({
      move_number: moveNumber,
      move: move.san,
      description: topFindings.map((finding) => finding.description).join(" "),
      severity: topFindings[0]?.severity ?? 0,
      phase,
      motif: topFindings[0]?.motif ?? "material",
    });
  }

  return {
    total_moves: moves.length,
    blunders: blunders.map(({ move_number, move, description }) => ({
      move_number,
      move,
      description,
    })),
    summary: buildSummary(blunders, normalizedPerspective),
  };
}

function normalizePerspective(
  perspective?: AnalysisPerspective,
): InternalColor | undefined {
  if (perspective === "white") {
    return "w";
  }

  if (perspective === "black") {
    return "b";
  }

  return undefined;
}

function determinePhase(moveNumber: number): GamePhase {
  if (moveNumber <= 10) {
    return "opening";
  }

  if (moveNumber <= 30) {
    return "middlegame";
  }

  return "endgame";
}

function buildSummary(
  blunders: InternalBlunder[],
  perspective?: InternalColor,
): string {
  if (blunders.length === 0) {
    return perspective
      ? "No obvious blunders were detected by the v1 scan."
      : "No obvious blunders were detected in this game by the v1 scan.";
  }

  const phaseCounts = countBy(blunders.map((blunder) => blunder.phase));
  const motifCounts = countBy(blunders.map((blunder) => blunder.motif));
  const topPhase = dominantKey(phaseCounts);
  const topMotif = dominantKey(motifCounts);
  const subject = perspective ? "You" : "This game";
  const motifSummary =
    topMotif === "mate"
      ? "mostly from missed mating shots and king safety."
      : "mostly from hanging pieces and loose material.";

  return `${subject} blundered ${blunders.length} time${blunders.length === 1 ? "" : "s"}, mostly in the ${topPhase}. ${capitalize(motifSummary)}`;
}

function countBy<T extends string>(values: T[]) {
  const counts = new Map<T, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return counts;
}

function dominantKey<T extends string>(counts: Map<T, number>): T {
  let winner: T | undefined;
  let winnerCount = -1;

  for (const [value, count] of counts.entries()) {
    if (count > winnerCount) {
      winner = value;
      winnerCount = count;
    }
  }

  if (!winner) {
    throw new Error("Expected at least one counted value.");
  }

  return winner;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function matchesMove(currentMove: Move, winningMoves: Move[]) {
  return winningMoves.some((winningMove) => winningMove.san === currentMove.san);
}

function formatWinningLine(moves: Move[]) {
  return moves
    .slice(0, 2)
    .map((move) => move.san)
    .join(" or ");
}

function spendBudget(budget: { remaining: number }) {
  if (budget.remaining <= 0) {
    return false;
  }

  budget.remaining -= 1;
  return true;
}

function findMateInOneMoves(chess: Chess, budget: { remaining: number }) {
  const mates: Move[] = [];

  for (const move of chess.moves({ verbose: true })) {
    if (!spendBudget(budget)) {
      return [];
    }

    const resultingPosition = new Chess(move.after);
    if (resultingPosition.isCheckmate()) {
      mates.push(move);
    }
  }

  return mates;
}

function findMateInTwoMoves(chess: Chess, budget: { remaining: number }) {
  const winningMoves: Move[] = [];

  for (const firstMove of chess.moves({ verbose: true })) {
    if (!spendBudget(budget)) {
      return [];
    }

    const afterFirstMove = new Chess(firstMove.after);
    const replies = afterFirstMove.moves({ verbose: true });

    if (replies.length === 0) {
      continue;
    }

    let forcesMate = true;

    for (const reply of replies) {
      if (!spendBudget(budget)) {
        return [];
      }

      const afterReply = new Chess(reply.after);
      if (findMateInOneMoves(afterReply, budget).length === 0) {
        forcesMate = false;
        break;
      }
    }

    if (forcesMate) {
      winningMoves.push(firstMove);
    }
  }

  return winningMoves;
}

function findMaterialBlunder(afterMove: Chess): {
  description: string;
  severity: number;
  motif: BlunderMotif;
} | null {
  const replies = afterMove.moves({ verbose: true });
  let best:
    | {
        description: string;
        severity: number;
        motif: BlunderMotif;
        netGain: number;
      }
    | null = null;

  for (const reply of replies) {
    if (!reply.isCapture() || !reply.captured) {
      continue;
    }

    const capturedValue = PIECE_VALUES[reply.captured];
    if (capturedValue < 3) {
      continue;
    }

    const afterCapture = new Chess(reply.after);
    const recaptureExists = afterCapture
      .moves({ verbose: true })
      .some((response) => response.isCapture() && response.to === reply.to);
    const attackerValue = PIECE_VALUES[reply.piece];
    const netGain = recaptureExists ? capturedValue - attackerValue : capturedValue;

    if (netGain < 3) {
      continue;
    }

    const pieceName = describePiece(reply.captured);
    const description = recaptureExists
      ? `This loses your ${pieceName}. ${reply.san} wins material immediately.`
      : `You left your ${pieceName} hanging. ${reply.san} wins it immediately.`;
    const severity =
      capturedValue >= 9 ? 88 : capturedValue >= 5 ? 72 : 58;

    if (!best || netGain > best.netGain || severity > best.severity) {
      best = {
        description,
        severity,
        motif: "material",
        netGain,
      };
    }
  }

  if (!best) {
    return null;
  }

  return {
    description: best.description,
    severity: best.severity,
    motif: best.motif,
  };
}

function describePiece(piece: PieceSymbol) {
  switch (piece) {
    case "n":
      return "knight";
    case "b":
      return "bishop";
    case "r":
      return "rook";
    case "q":
      return "queen";
    case "k":
      return "king";
    default:
      return "pawn";
  }
}
