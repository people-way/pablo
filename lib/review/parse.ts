import { Chess, validateFen, type Square } from "chess.js";
import type { ParsedGame, ParsedMove, PgnDocument } from "./types";

export class ReviewInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewInputError";
  }
}

export function parsePgn(raw: string): ParsedGame {
  const pgn = unwrapPgn(raw);

  if (!pgn) {
    throw new ReviewInputError("Colle un PGN pour ouvrir une partie.");
  }

  const chess = new Chess();
  const readable = relaxAnnotations(pgn);

  try {
    chess.loadPgn(readable);
  } catch (error) {
    throw toPgnError(error);
  }

  const headers = chess.getHeaders();
  const comments = new Map(
    chess
      .getComments()
      .map((entry) => [entry.fen, cleanComment(entry.comment)] as const)
      .filter((entry) => entry[1]),
  );
  const verbose = chess.history({ verbose: true });
  const moves: ParsedMove[] = verbose.map((move, index) => ({
    ply: index + 1,
    moveNumber: Math.floor(index / 2) + 1,
    san: move.san,
    uci: toUci(move.from, move.to, move.promotion),
    color: move.color,
    fenBefore: move.before,
    fenAfter: move.after,
    comment: comments.get(move.after) ?? "",
  }));
  const startFen = moves[0]?.fenBefore ?? chess.fen();

  return {
    white: headerOr(headers.White, "Blanc"),
    black: headerOr(headers.Black, "Noir"),
    result: headerOr(headers.Result, "*"),
    date: headers.Date ?? "",
    event: headers.Event ?? "",
    opening: headers.Opening ?? headers.ECO ?? "",
    startFen,
    startComment: comments.get(startFen) ?? "",
    hasVariations: movetextHasVariations(pgn),
    moves,
  };
}

/** Split a paste that contains several games. Broken games are skipped. */
export function parsePgnCollection(raw: string): { games: PgnDocument[]; skipped: number } {
  const text = unwrapPgn(raw);

  if (!text) {
    throw new ReviewInputError("Colle un PGN pour ouvrir une partie.");
  }

  const parts = splitPgnGames(text);
  const games: PgnDocument[] = [];
  let skipped = 0;
  let firstError: ReviewInputError | null = null;

  for (const part of parts) {
    try {
      games.push({ pgn: part, game: parsePgn(part) });
    } catch (error) {
      skipped += 1;
      if (!firstError) {
        firstError = error instanceof ReviewInputError ? error : toPgnError(error);
      }
    }
  }

  if (games.length === 0) {
    throw firstError ?? new ReviewInputError("Ce PGN n'a pas pu être lu. Vérifie le texte collé.");
  }

  return { games, skipped };
}

export function parseFen(raw: string) {
  const extracted = extractFen(raw);

  if (!extracted) {
    throw new ReviewInputError("Colle une position FEN.");
  }

  const candidates = fenCandidates(extracted);
  let lastError = "Cette FEN est invalide.";

  for (const candidate of candidates) {
    const validation = validateFen(candidate);

    if (!validation.ok) {
      lastError = validation.error ?? lastError;
      continue;
    }

    try {
      return new Chess(candidate).fen();
    } catch {
      lastError = "Cette FEN est invalide.";
    }
  }

  throw new ReviewInputError(frenchFenError(lastError));
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

function unwrapPgn(raw: string) {
  let text = raw.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  const fenced = text.match(/^```[a-z]*\n([\s\S]*?)\n```$/i);

  if (fenced) {
    text = fenced[1].trim();
  }

  return text;
}

function splitPgnGames(text: string) {
  const games: string[] = [];
  let current: string[] = [];
  let seenMoves = false;

  for (const line of text.split("\n")) {
    const trimmed = line.trim();

    if (seenMoves && /^\[[A-Za-z0-9]/.test(trimmed)) {
      const game = current.join("\n").trim();

      if (game) {
        games.push(game);
      }

      current = [line];
      seenMoves = false;
      continue;
    }

    current.push(line);

    if (trimmed && !trimmed.startsWith("[")) {
      seenMoves = true;
    }
  }

  const last = current.join("\n").trim();

  if (last) {
    games.push(last);
  }

  return games;
}

/**
 * chess.js rejects a comment that follows a variation, and two comments in a row.
 * Move the trailing comment in front of its variation, then merge adjacent comments.
 */
function relaxAnnotations(pgn: string) {
  let text = pgn;

  for (let guard = 0; guard < 40; guard += 1) {
    const moved = moveCommentAfterVariation(text);

    if (moved === text) {
      break;
    }

    text = moved;
  }

  let merged = text;

  for (let guard = 0; guard < 20; guard += 1) {
    const next = merged.replace(/\{([^{}]*)\}\s*\{([^{}]*)\}/g, "{$1 $2}");

    if (next === merged) {
      break;
    }

    merged = next;
  }

  return merged;
}

function moveCommentAfterVariation(text: string) {
  const opens: number[] = [];
  let inComment = false;
  let inHeader = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inComment) {
      if (char === "}") {
        inComment = false;
      }
      continue;
    }

    if (inHeader) {
      if (char === "]") {
        inHeader = false;
      }
      continue;
    }

    if (char === "{") {
      inComment = true;
      continue;
    }

    if (char === "[" && (index === 0 || text[index - 1] === "\n")) {
      inHeader = true;
      continue;
    }

    if (char === "(") {
      opens.push(index);
      continue;
    }

    if (char !== ")" || opens.length === 0) {
      continue;
    }

    const openAt = opens.pop();

    if (openAt == null) {
      continue;
    }

    const trailing = text.slice(index + 1).match(/^\s*\{([^{}]*)\}/);

    if (!trailing) {
      continue;
    }

    const before = text.slice(0, openAt);
    const variation = text.slice(openAt, index + 1);
    const after = text.slice(index + 1 + trailing[0].length);
    return `${before}{${trailing[1]}} ${variation}${after}`;
  }

  return text;
}

function movetextHasVariations(pgn: string) {
  const withoutHeaders = pgn.replace(/^\[[^\]]*\][^\n]*$/gm, "");
  const withoutComments = withoutHeaders.replace(/\{[^}]*\}/g, "");
  return withoutComments.includes("(");
}

function cleanComment(raw: string) {
  return raw
    .replace(/\[%(?:clk|eval|emt|csl|cal|annotator)\s[^\]]*\]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toPgnError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const invalid = message.match(/Invalid move in PGN:\s*(.+)/i);

  if (invalid) {
    const move = invalid[1].replace(/\.$/, "");

    if (move === "--" || move === "Z0" || move === "0000") {
      return new ReviewInputError("Ce PGN contient un coup nul (--), qui n'est pas rejouable.");
    }

    return new ReviewInputError(`Coup illisible dans le PGN : ${move}.`);
  }

  if (/null move|Z0|--/i.test(message)) {
    return new ReviewInputError("Ce PGN contient un coup nul (--), qui n'est pas rejouable.");
  }

  if (/FEN/i.test(message)) {
    return new ReviewInputError("La position initiale de ce PGN est invalide.");
  }

  if (/Expected end of input|but "." found/i.test(message)) {
    return new ReviewInputError("Ce PGN contient une annotation illisible. Réessaie avec la ligne principale seule.");
  }

  return new ReviewInputError("Ce PGN n'a pas pu être lu. Vérifie le texte collé.");
}

function extractFen(raw: string) {
  const text = raw.replace(/^\uFEFF/, "").trim();
  const match = text.match(/((?:[pnbrqkPNBRQK1-8]+\/){7}[pnbrqkPNBRQK1-8]+(?:\s+\S+){0,5})/);
  return (match?.[1] ?? "").trim();
}

function fenCandidates(fen: string) {
  const tokens = fen.split(/\s+/).slice(0, 6);
  const completed = completeFen(tokens);
  const candidates = [completed];
  const fields = completed.split(/\s+/);

  if (fields[3] && fields[3] !== "-") {
    const relaxed = [...fields];
    relaxed[3] = "-";
    candidates.push(relaxed.join(" "));
  }

  return candidates;
}

function completeFen(tokens: string[]) {
  const fields = tokens.slice(0, 6);

  if (fields.length === 4) {
    return `${fields.join(" ")} 0 1`;
  }

  if (fields.length === 5) {
    return `${fields.join(" ")} 1`;
  }

  return fields.join(" ");
}

function frenchFenError(error: string) {
  if (/six space/i.test(error)) {
    return "Cette FEN est incomplète. Colle la position complète, ou au moins les pièces, le trait, les roques et la prise en passant.";
  }

  if (/en-passant/i.test(error)) {
    return "La case de prise en passant de cette FEN est invalide.";
  }

  if (/kings/i.test(error)) {
    return "Cette FEN doit contenir un roi blanc et un roi noir.";
  }

  if (/piece data|edge rows|castling|side-to-move|half move|move number/i.test(error)) {
    return "La position de cette FEN est invalide.";
  }

  return "Cette FEN est invalide.";
}

function headerOr(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}
