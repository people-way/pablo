import { Chess, type Square } from "chess.js";

export type VariationMove = { san: string; uci: string };

export type BoardVariation = {
  id: string;
  rootFen: string;
  /** Ply of the main game this line leaves. Null on a bare position. */
  anchorPly: number | null;
  moves: VariationMove[];
  /** Cursor remembered when the line was last open. */
  cursor: number;
};

export type VariationTrail = {
  variations: BoardVariation[];
  activeId: string | null;
  cursor: number;
};

export const MAX_VARIATIONS = 8;
export const MAX_VARIATION_MOVES = 40;

const UCI = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

export function emptyTrail(): VariationTrail {
  return { variations: [], activeId: null, cursor: 0 };
}

export function activeVariation(trail: VariationTrail) {
  return trail.variations.find((line) => line.id === trail.activeId) ?? null;
}

export function isBrowsing(trail: VariationTrail) {
  return activeVariation(trail) != null;
}

/** Play UCI moves from a FEN. Stops at the first illegal move. */
export function lineFromUci(fen: string, uciMoves: string[]) {
  const chess = load(fen);
  const played: VariationMove[] = [];

  if (!chess) {
    return played;
  }

  for (const uci of uciMoves) {
    const move = played.length >= MAX_VARIATION_MOVES ? null : play(chess, uci);

    if (!move) {
      break;
    }

    played.push(move);
  }

  return played;
}

export function fenOnTrail(trail: VariationTrail, fallbackFen: string) {
  const line = activeVariation(trail);

  if (!line) {
    return fallbackFen;
  }

  if (trail.cursor <= 0) {
    return line.rootFen;
  }

  const chess = load(line.rootFen);

  for (const move of line.moves.slice(0, trail.cursor)) {
    if (!chess || !play(chess, move.uci)) {
      return line.rootFen;
    }
  }

  return chess?.fen() ?? line.rootFen;
}

export function stepTrail(trail: VariationTrail, direction: number) {
  return jumpTrail(trail, trail.cursor + direction);
}

export function jumpTrail(trail: VariationTrail, cursor: number): VariationTrail {
  const line = activeVariation(trail);

  if (!line) {
    return trail;
  }

  const next = clamp(cursor, 0, line.moves.length);
  return { ...trail, cursor: next, variations: stamp(trail.variations, line.id, next) };
}

export function endTrail(trail: VariationTrail) {
  const line = activeVariation(trail);
  return line ? jumpTrail(trail, line.moves.length) : trail;
}

export function leaveTrail(trail: VariationTrail): VariationTrail {
  const line = activeVariation(trail);
  return {
    variations: line ? stamp(trail.variations, line.id, trail.cursor) : trail.variations,
    activeId: null,
    cursor: 0,
  };
}

export function openVariation(trail: VariationTrail, id: string): VariationTrail {
  const line = trail.variations.find((item) => item.id === id);

  if (!line || line.moves.length === 0) {
    return trail;
  }

  const cursor = line.cursor > 0 ? clamp(line.cursor, 1, line.moves.length) : 1;
  return { ...trail, activeId: line.id, cursor };
}

export function variationsAt(trail: VariationTrail, anchorPly: number | null, rootFen: string) {
  return trail.variations.filter((line) => line.anchorPly === anchorPly && line.rootFen === rootFen && line.moves.length > 0);
}

export function variationLabel(line: BoardVariation) {
  const head = line.moves.slice(0, 5).map((move) => move.san).join(" ");
  return line.moves.length > 5 ? `${head} · ${line.moves.length}` : head;
}

/** SAN with a move number on White's moves, and on Black's first move of the line. */
export function moveCaption(rootFen: string, moves: VariationMove[], index: number) {
  const san = moves[index]?.san ?? "";
  const chess = load(rootFen);

  if (!chess) {
    return san;
  }

  for (let cursor = 0; cursor < index; cursor += 1) {
    if (!play(chess, moves[cursor]?.uci ?? "")) {
      return san;
    }
  }

  if (chess.turn() === "w") {
    return `${chess.moveNumber()}. ${san}`;
  }

  return index === 0 ? `${chess.moveNumber()}… ${san}` : san;
}

export function playOnTrail(
  trail: VariationTrail,
  input: { id: string; rootFen: string; anchorPly: number | null; san: string; uci: string },
) {
  return adopt(trail, input.id, input.rootFen, input.anchorPly, [{ san: input.san, uci: input.uci }], "played");
}

export function followOnTrail(
  trail: VariationTrail,
  input: { id: string; rootFen: string; anchorPly: number | null; moves: VariationMove[] },
) {
  return input.moves.length === 0 ? trail : adopt(trail, input.id, input.rootFen, input.anchorPly, input.moves, "first");
}

export function parseTrail(value: unknown): VariationTrail | null {
  if (!record(value) || !Array.isArray(value.variations) || value.variations.length > MAX_VARIATIONS) {
    return null;
  }

  if (typeof value.cursor !== "number" || (value.activeId !== null && typeof value.activeId !== "string")) {
    return null;
  }

  const variations: BoardVariation[] = [];

  for (const item of value.variations) {
    const parsed = parseVariation(item);

    if (!parsed) {
      return null;
    }

    variations.push(parsed);
  }

  const active = variations.find((line) => line.id === value.activeId) ?? null;
  return {
    variations,
    activeId: active?.id ?? null,
    cursor: active ? clamp(value.cursor, 0, active.moves.length) : 0,
  };
}

function adopt(
  trail: VariationTrail,
  id: string,
  fallbackFen: string,
  fallbackPly: number | null,
  extraIn: VariationMove[],
  landOn: "first" | "played",
): VariationTrail {
  const active = activeVariation(trail);
  const prefix = active ? active.moves.slice(0, trail.cursor) : [];
  const rootFen = active?.rootFen ?? fallbackFen;
  const anchorPly = active ? active.anchorPly : fallbackPly;
  const extra = extraIn.slice(0, Math.max(0, MAX_VARIATION_MOVES - prefix.length));

  if (extra.length === 0) {
    return trail;
  }

  const remembered = active ? stamp(trail.variations, active.id, trail.cursor) : trail.variations;
  const land = (total: number) => clamp(landOn === "first" ? prefix.length + 1 : prefix.length + extra.length, 0, total);

  if (active && extra.every((move, index) => !active.moves[prefix.length + index] || active.moves[prefix.length + index]?.uci === move.uci)) {
    const moves = active.moves.slice(0, MAX_VARIATION_MOVES);

    extra.forEach((move, index) => {
      if (!moves[prefix.length + index] && moves.length < MAX_VARIATION_MOVES) {
        moves.push(move);
      }
    });

    return activate(remembered, active.id, moves, land(moves.length));
  }

  const nextMoves = [...prefix, ...extra].slice(0, MAX_VARIATION_MOVES);
  const branch = (line: BoardVariation) => line.rootFen === rootFen && line.anchorPly === anchorPly;
  const longer = [...remembered].reverse().find((line) => branch(line) && line.moves.length >= nextMoves.length && isPrefix(nextMoves, line.moves));

  if (longer) {
    return activate(remembered, longer.id, longer.moves, land(longer.moves.length));
  }

  const shorter = remembered
    .filter((line) => branch(line) && line.moves.length > 0 && line.moves.length < nextMoves.length && isPrefix(line.moves, nextMoves))
    .sort((left, right) => right.moves.length - left.moves.length)[0];

  if (shorter) {
    return activate(remembered, shorter.id, nextMoves, land(nextMoves.length));
  }

  return activate(
    cap([...remembered, { id, rootFen, anchorPly, moves: nextMoves, cursor: 0 }], id),
    id,
    nextMoves,
    land(nextMoves.length),
  );
}

function isPrefix(shorter: VariationMove[], longer: VariationMove[]) {
  return shorter.every((move, index) => longer[index]?.uci === move.uci);
}

function activate(variations: BoardVariation[], id: string, moves: VariationMove[], cursor: number): VariationTrail {
  return {
    variations: stamp(variations.map((line) => (line.id === id ? { ...line, moves, cursor } : line)), id, cursor),
    activeId: id,
    cursor,
  };
}

function stamp(variations: BoardVariation[], id: string, cursor: number) {
  return variations.map((line) => (line.id === id ? { ...line, cursor } : line));
}

function cap(variations: BoardVariation[], activeId: string) {
  const next = [...variations];

  while (next.length > MAX_VARIATIONS) {
    const index = next.findIndex((line) => line.id !== activeId);

    if (index === -1) {
      break;
    }

    next.splice(index, 1);
  }

  return next;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseVariation(value: unknown): BoardVariation | null {
  if (!record(value) || typeof value.id !== "string" || value.id.length === 0 || value.id.length > 80) {
    return null;
  }

  if (typeof value.rootFen !== "string" || value.rootFen.length > 120 || typeof value.cursor !== "number") {
    return null;
  }

  if (value.anchorPly !== null && (typeof value.anchorPly !== "number" || value.anchorPly < 0 || value.anchorPly > 600)) {
    return null;
  }

  if (!Array.isArray(value.moves) || value.moves.length > MAX_VARIATION_MOVES) {
    return null;
  }

  const uci = value.moves.map((move) => (record(move) && typeof move.uci === "string" ? move.uci : ""));
  const sans = value.moves.map((move) => (record(move) && typeof move.san === "string" ? move.san : ""));
  const moves = lineFromUci(value.rootFen, uci);

  if (moves.length !== value.moves.length || moves.some((move, index) => move.san !== sans[index] || move.uci !== uci[index])) {
    return null;
  }

  return {
    id: value.id,
    rootFen: value.rootFen,
    anchorPly: value.anchorPly ?? null,
    moves,
    cursor: clamp(value.cursor, 0, moves.length),
  };
}

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function load(fen: string) {
  try {
    return new Chess(fen);
  } catch {
    return null;
  }
}

function play(chess: Chess, uci: string): VariationMove | null {
  if (!UCI.test(uci)) {
    return null;
  }

  try {
    const move = chess.move({
      from: uci.slice(0, 2) as Square,
      to: uci.slice(2, 4) as Square,
      promotion: uci[4] as "q" | "r" | "b" | "n" | undefined,
    });
    return move ? { san: move.san, uci } : null;
  } catch {
    return null;
  }
}
