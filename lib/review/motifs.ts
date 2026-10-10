import { Chess, type Color, type PieceSymbol, type Square } from "chess.js";

/**
 * Motifs are reported only when the board confirms them.
 * A knight that does not attack two targets is not a fork, even if the eval collapsed.
 */

const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

const FILES = "abcdefgh";
const RANKS = "12345678";

export type Motif =
  | "mat"
  | "fourchette"
  | "clouage"
  | "enfilade"
  | "echec-decouvert"
  | "echec-double"
  | "piece-en-prise"
  | "coup-intermediaire"
  | "promotion"
  | "materiel"
  | "finale";

export type LooseCapture = {
  from: Square;
  to: Square;
  san: string;
  uci: string;
  gain: number;
  victim: PieceSymbol;
};

export type Pin = {
  pinned: Square;
  pinnedType: PieceSymbol;
  by: Square;
  against: Square;
  againstType: PieceSymbol;
  absolute: boolean;
};

type Verbose = {
  color: Color;
  from: Square;
  to: Square;
  piece: PieceSymbol;
  captured?: PieceSymbol;
  promotion?: PieceSymbol;
  san: string;
};

export function allSquares(): Square[] {
  const squares: Square[] = [];
  for (const file of FILES) {
    for (const rank of RANKS) {
      squares.push(`${file}${rank}` as Square);
    }
  }
  return squares;
}

export function fileIndex(square: Square) {
  return square.charCodeAt(0) - 97;
}

export function rankIndex(square: Square) {
  return Number(square[1]) - 1;
}

export function squareAt(file: number, rank: number): Square | null {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) {
    return null;
  }
  return `${FILES[file]}${rank + 1}` as Square;
}

export function opposite(color: Color): Color {
  return color === "w" ? "b" : "w";
}

export function pieceValue(type: PieceSymbol) {
  return VALUE[type];
}

export function loadChess(fen: string) {
  try {
    return new Chess(fen);
  } catch {
    return null;
  }
}

export function playUci(chess: Chess, uci: string) {
  try {
    return chess.move({
      from: uci.slice(0, 2) as Square,
      to: uci.slice(2, 4) as Square,
      promotion: uci[4] as PieceSymbol | undefined,
    });
  } catch {
    return null;
  }
}

export function uciOf(move: { from: Square; to: Square; promotion?: string }) {
  return `${move.from}${move.to}${move.promotion ?? ""}`;
}

/** True when the piece on `from` attacks `to`, path included. Pins are ignored: this is geometry. */
export function pieceAttacks(chess: Chess, from: Square, to: Square) {
  const piece = chess.get(from);
  if (!piece || from === to) {
    return false;
  }

  const df = fileIndex(to) - fileIndex(from);
  const dr = rankIndex(to) - rankIndex(from);
  const adf = Math.abs(df);
  const adr = Math.abs(dr);

  if (piece.type === "n") {
    return (adf === 1 && adr === 2) || (adf === 2 && adr === 1);
  }

  if (piece.type === "k") {
    return Math.max(adf, adr) === 1;
  }

  if (piece.type === "p") {
    const forward = piece.color === "w" ? 1 : -1;
    return dr === forward && adf === 1;
  }

  const diagonal = adf === adr && adf > 0;
  const straight = (df === 0 || dr === 0) && adf + adr > 0;
  if (piece.type === "b" && !diagonal) return false;
  if (piece.type === "r" && !straight) return false;
  if (piece.type === "q" && !diagonal && !straight) return false;
  if (!diagonal && !straight) return false;

  const stepFile = Math.sign(df);
  const stepRank = Math.sign(dr);
  let file = fileIndex(from) + stepFile;
  let rank = rankIndex(from) + stepRank;
  while (file !== fileIndex(to) || rank !== rankIndex(to)) {
    const square = squareAt(file, rank);
    if (!square || chess.get(square)) {
      return false;
    }
    file += stepFile;
    rank += stepRank;
  }

  return true;
}

export function kingSquare(chess: Chess, color: Color): Square | null {
  for (const square of allSquares()) {
    const piece = chess.get(square);
    if (piece?.type === "k" && piece.color === color) {
      return square;
    }
  }
  return null;
}

function captureValue(move: { captured?: PieceSymbol; promotion?: PieceSymbol }) {
  if (!move.captured) {
    return 0;
  }
  const promotion = move.promotion ? VALUE[move.promotion] - VALUE.p : 0;
  return VALUE[move.captured] + promotion;
}

/** Material the side to move can win by capturing on `square`. Zero when every capture loses or hangs. */
export function see(chess: Chess, square: Square): number {
  const captures = chess
    .moves({ verbose: true })
    .filter((move) => move.to === square && move.captured) as Verbose[];

  if (captures.length === 0) {
    return 0;
  }

  captures.sort((left, right) => VALUE[left.piece] - VALUE[right.piece]);
  const move = captures[0];
  const gain = captureValue(move);

  if (!chess.move(move)) {
    return 0;
  }

  const reply = see(chess, square);
  chess.undo();
  return Math.max(0, gain - reply);
}

function seeOf(chess: Chess, move: Verbose) {
  const gain = captureValue(move);
  if (!chess.move(move)) {
    return 0;
  }
  const reply = see(chess, move.to);
  chess.undo();
  return Math.max(0, gain - reply);
}

/** Captures the side to move can play that win at least a pawn on static exchange. */
export function profitableCaptures(chess: Chess): LooseCapture[] {
  const moves = (chess.moves({ verbose: true }) as Verbose[]).filter((move) => move.captured);
  const found: LooseCapture[] = [];

  for (const move of moves) {
    const gain = seeOf(chess, move);
    if (move.captured && gain >= 1) {
      found.push({
        from: move.from,
        to: move.to,
        san: move.san.replace(/[+#]$/, ""),
        uci: uciOf(move),
        gain,
        victim: move.captured,
      });
    }
  }

  found.sort((left, right) => right.gain - left.gain);
  return found;
}

export function forkTargets(chess: Chess, square: Square) {
  const piece = chess.get(square);
  if (!piece || piece.type === "k") {
    return [];
  }

  const targets: Array<{ square: Square; type: PieceSymbol }> = [];

  for (const target of allSquares()) {
    const other = chess.get(target);
    if (!other || other.color === piece.color || other.type === "p") {
      continue;
    }
    if (!pieceAttacks(chess, square, target)) {
      continue;
    }
    if (other.type === "k" && !chess.isCheck()) {
      continue;
    }
    targets.push({ square: target, type: other.type });
  }

  const king = targets.find((target) => target.type === "k");
  const pieces = targets.filter((target) => target.type !== "k");
  const chosen = king && pieces.length > 0 ? [king, ...pieces] : pieces.length >= 2 ? pieces : [];

  if (chosen.length < 2) {
    return [];
  }

  // A fork that simply drops the forking piece is not the motif.
  if (see(chess, square) >= 1) {
    return [];
  }

  return chosen.sort((left, right) => VALUE[right.type] - VALUE[left.type]);
}

function ray(from: Square, to: Square) {
  const df = fileIndex(to) - fileIndex(from);
  const dr = rankIndex(to) - rankIndex(from);
  if (df === 0 && dr === 0) {
    return null;
  }
  const adf = Math.abs(df);
  const adr = Math.abs(dr);
  if (df !== 0 && dr !== 0 && adf !== adr) {
    return null;
  }
  const steps = Math.max(adf, adr);
  return { df: Math.sign(df), dr: Math.sign(dr), steps };
}

function squaresBetween(from: Square, to: Square) {
  const line = ray(from, to);
  if (!line) {
    return [];
  }
  const between: Square[] = [];
  let file = fileIndex(from) + line.df;
  let rank = rankIndex(from) + line.dr;
  for (let step = 1; step < line.steps; step += 1) {
    const square = squareAt(file, rank);
    if (square) {
      between.push(square);
    }
    file += line.df;
    rank += line.dr;
  }
  return between;
}

function sliderReaches(type: PieceSymbol, from: Square, to: Square) {
  const line = ray(from, to);
  if (!line) {
    return false;
  }
  const diagonal = line.df !== 0 && line.dr !== 0;
  const straight = line.df === 0 || line.dr === 0;
  if (type === "b") return diagonal;
  if (type === "r") return straight;
  if (type === "q") return diagonal || straight;
  return false;
}

export function pinsAgainst(chess: Chess, color: Color): Pin[] {
  const pins: Pin[] = [];
  const enemy = opposite(color);
  const targets: Array<{ square: Square; absolute: boolean }> = [];
  const king = kingSquare(chess, color);

  if (king) {
    targets.push({ square: king, absolute: true });
  }

  for (const square of allSquares()) {
    const piece = chess.get(square);
    if (piece?.color === color && (piece.type === "q" || piece.type === "r")) {
      targets.push({ square, absolute: false });
    }
  }

  for (const target of targets) {
    const targetPiece = chess.get(target.square);
    if (!targetPiece) {
      continue;
    }

    for (const from of allSquares()) {
      const slider = chess.get(from);
      if (!slider || slider.color !== enemy || !sliderReaches(slider.type, from, target.square)) {
        continue;
      }

      const between = squaresBetween(from, target.square);
      const blockers = between.filter((square) => chess.get(square));
      if (blockers.length !== 1) {
        continue;
      }

      const pinnedSquare = blockers[0];
      const pinned = chess.get(pinnedSquare);
      if (!pinned || pinned.color !== color || pinned.type === "k") {
        continue;
      }

      if (!target.absolute && VALUE[pinned.type] >= VALUE[targetPiece.type]) {
        continue;
      }

      if (!target.absolute && pinned.type === "p") {
        continue;
      }

      pins.push({
        pinned: pinnedSquare,
        pinnedType: pinned.type,
        by: from,
        against: target.square,
        againstType: targetPiece.type,
        absolute: target.absolute,
      });
    }
  }

  return pins;
}

export function skewer(chess: Chess, movedTo: Square) {
  const piece = chess.get(movedTo);
  if (!piece || (piece.type !== "b" && piece.type !== "r" && piece.type !== "q") || !chess.isCheck()) {
    return null;
  }

  const king = kingSquare(chess, opposite(piece.color));
  if (!king || !pieceAttacks(chess, movedTo, king)) {
    return null;
  }

  const line = ray(movedTo, king);
  if (!line) {
    return null;
  }

  let file = fileIndex(king) + line.df;
  let rank = rankIndex(king) + line.dr;

  while (true) {
    const square = squareAt(file, rank);
    if (!square) {
      return null;
    }
    const occupant = chess.get(square);
    if (occupant) {
      if (occupant.color === piece.color || occupant.type === "k" || VALUE[occupant.type] < 3) {
        return null;
      }
      if (see(chess, movedTo) >= 1) {
        return null;
      }
      return { front: king, rear: square, rearType: occupant.type };
    }
    file += line.df;
    rank += line.dr;
  }
}

export function checkKind(chess: Chess, movedTo: Square): "decouvert" | "double" | "direct" | null {
  if (!chess.isCheck()) {
    return null;
  }

  const piece = chess.get(movedTo);
  const king = piece ? kingSquare(chess, opposite(piece.color)) : null;
  if (!piece || !king) {
    return null;
  }

  const moverChecks = pieceAttacks(chess, movedTo, king);
  let others = 0;

  for (const square of allSquares()) {
    if (square === movedTo) {
      continue;
    }
    const other = chess.get(square);
    if (other?.color === piece.color && pieceAttacks(chess, square, king)) {
      others += 1;
    }
  }

  if (moverChecks && others > 0) return "double";
  if (!moverChecks && others > 0) return "decouvert";
  if (moverChecks) return "direct";
  return null;
}

/** Forced mate in at most `maxMoves` full moves. Null when the search cannot prove it. */
export function findForcedMate(fen: string, maxMoves: number): string[] | null {
  const chess = loadChess(fen);
  if (!chess || maxMoves < 1) {
    return null;
  }

  const board = chess;
  let nodes = 0;

  function search(depth: number): string[] | null {
    const moves = board.moves({ verbose: true }) as Verbose[];
    moves.sort((left, right) => scoreMove(right) - scoreMove(left));

    for (const move of moves) {
      nodes += 1;
      if (nodes > 25_000) {
        return null;
      }

      board.move(move);
      if (board.isCheckmate()) {
        board.undo();
        return [move.san];
      }

      if (depth === 1) {
        board.undo();
        continue;
      }

      const replies = board.moves({ verbose: true }) as Verbose[];
      if (replies.length === 0) {
        board.undo();
        continue;
      }

      let sample: string[] | null = null;
      let everyReplyMates = true;

      for (const reply of replies) {
        board.move(reply);
        const continuation = search(depth - 1);
        board.undo();
        if (!continuation) {
          everyReplyMates = false;
          break;
        }
        sample ??= [reply.san, ...continuation];
      }

      board.undo();
      if (everyReplyMates && sample) {
        return [move.san, ...sample];
      }
    }

    return null;
  }

  return search(maxMoves);
}

function scoreMove(move: Verbose) {
  return (move.san.includes("#") ? 2 : 0) + (move.san.includes("+") ? 1 : 0);
}

export function mateLine(fen: string, pvUci: string[]) {
  const chess = loadChess(fen);
  if (!chess) {
    return null;
  }

  const sans: string[] = [];

  for (const uci of pvUci) {
    const move = playUci(chess, uci);
    if (!move) {
      return null;
    }
    sans.push(move.san);
    if (chess.isCheckmate()) {
      return sans;
    }
  }

  return null;
}

export function materialCount(chess: Chess, color: Color) {
  let total = 0;
  for (const square of allSquares()) {
    const piece = chess.get(square);
    if (piece && piece.color === color && piece.type !== "k") {
      total += VALUE[piece.type];
    }
  }
  return total;
}

/** Net material for `color` after an even number of plies, so the opponent has answered. */
export function stableMaterialGain(fen: string, pvUci: string[], color: Color) {
  const chess = loadChess(fen);
  if (!chess || pvUci.length < 2) {
    return 0;
  }

  const start = materialCount(chess, color);
  let played = 0;
  let net = 0;

  for (const uci of pvUci) {
    if (!playUci(chess, uci)) {
      break;
    }
    played += 1;
    if (played % 2 === 0) {
      net = materialCount(chess, color) - start;
    }
  }

  return played >= 2 ? net : 0;
}

export function opponentQueenCaptured(fen: string, pvUci: string[], color: Color) {
  const chess = loadChess(fen);
  if (!chess) {
    return false;
  }
  const enemy = opposite(color);
  const before = countPiece(chess, enemy, "q");
  let played = 0;
  let queens = before;

  for (const uci of pvUci) {
    if (!playUci(chess, uci)) {
      break;
    }
    played += 1;
    if (played % 2 === 0) {
      queens = countPiece(chess, enemy, "q");
    }
  }

  return queens < before;
}

function countPiece(chess: Chess, color: Color, type: PieceSymbol) {
  let total = 0;
  for (const square of allSquares()) {
    const piece = chess.get(square);
    if (piece?.color === color && piece.type === type) {
      total += 1;
    }
  }
  return total;
}

export function isEndgame(fen: string) {
  const chess = loadChess(fen);
  if (!chess) {
    return false;
  }

  let queens = 0;
  let material = 0;

  for (const square of allSquares()) {
    const piece = chess.get(square);
    if (!piece || piece.type === "k") {
      continue;
    }
    material += VALUE[piece.type];
    if (piece.type === "q") {
      queens += 1;
    }
  }

  return material <= 14 || (queens === 0 && material <= 22);
}
