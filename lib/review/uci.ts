export type InfoScore = {
  depth: number;
  multipv: number;
  cp: number | null;
  mate: number | null;
  pvUci: string[];
};

/** Parse a Stockfish `info` line that carries a score and a principal variation. */
export function parseInfoLine(line: string): InfoScore | null {
  const trimmed = line.trim();

  if (!trimmed.startsWith("info ") || !trimmed.includes(" pv ")) {
    return null;
  }

  if (trimmed.includes(" lowerbound") || trimmed.includes(" upperbound")) {
    return null;
  }

  const depth = numberAfter(trimmed, "depth ");
  const score = trimmed.match(/\bscore (cp|mate) (-?\d+)/);

  if (depth == null || !score) {
    return null;
  }

  const multipv = numberAfter(trimmed, "multipv ") ?? 1;
  const pv = trimmed.slice(trimmed.lastIndexOf(" pv ") + 4).trim().split(/\s+/).filter(Boolean);

  if (pv.length === 0) {
    return null;
  }

  const kind = score[1];
  const value = Number.parseInt(score[2], 10);

  return {
    depth,
    multipv,
    cp: kind === "cp" ? value : null,
    mate: kind === "mate" ? value : null,
    pvUci: pv,
  };
}

/** `undefined` when the line is not a bestmove. `null` when the engine has no move. */
export function parseBestMove(line: string): string | null | undefined {
  const trimmed = line.trim();

  if (!trimmed.startsWith("bestmove ")) {
    return undefined;
  }

  const move = trimmed.split(/\s+/)[1];

  if (!move || move === "(none)") {
    return null;
  }

  return move;
}

function numberAfter(line: string, label: string) {
  const index = line.indexOf(label);

  if (index === -1) {
    return null;
  }

  const value = Number.parseInt(line.slice(index + label.length), 10);
  return Number.isFinite(value) ? value : null;
}
