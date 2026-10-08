import { Chess, validateFen, type Square } from "chess.js";
import type { ParsedGame, ParsedMove } from "./types";

export class ReviewInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewInputError";
  }
}

export function parsePgn(raw: string): ParsedGame {
  const pgn = raw.trim();

  if (!pgn) {
    throw new ReviewInputError("Colle un PGN pour ouvrir une partie.");
  }

  const chess = new Chess();

  try {
    chess.loadPgn(pgn);
  } catch {
    throw new ReviewInputError("Ce PGN n'a pas pu être lu. Vérifie le texte collé.");
  }

  const headers = chess.getHeaders();
  const verbose = chess.history({ verbose: true });
  const moves: ParsedMove[] = verbose.map((move, index) => ({
    ply: index + 1,
    moveNumber: Math.floor(index / 2) + 1,
    san: move.san,
    uci: toUci(move.from, move.to, move.promotion),
    color: move.color,
    fenBefore: move.before,
    fenAfter: move.after,
  }));

  const startFen = moves[0]?.fenBefore ?? chess.fen();

  return {
    white: headerOr(headers.White, "Blanc"),
    black: headerOr(headers.Black, "Noir"),
    result: headerOr(headers.Result, "*"),
    date: headers.Date ?? "",
    event: headers.Event ?? "",
    opening: headers.Opening ?? "",
    startFen,
    moves,
  };
}

export function parseFen(raw: string) {
  const fen = raw.trim();

  if (!fen) {
    throw new ReviewInputError("Colle une position FEN.");
  }

  const validation = validateFen(fen);

  if (!validation.ok) {
    throw new ReviewInputError("Cette FEN est invalide.");
  }

  const chess = new Chess(fen);
  return chess.fen();
}

export function toUci(from: Square, to: Square, promotion?: string) {
  return `${from}${to}${promotion ?? ""}`;
}

export function uciToSan(fen: string, uciMoves: string[]) {
  const chess = new Chess(fen);
  const sans: string[] = [];

  for (const uci of uciMoves) {
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci[4];

    try {
      const move = chess.move({ from, to, promotion });
      sans.push(move.san);
    } catch {
      break;
    }
  }

  return sans;
}

export function sanLine(fen: string, uciMoves: string[]) {
  return uciToSan(fen, uciMoves).join(" ");
}

function headerOr(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}
