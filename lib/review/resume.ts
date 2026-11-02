import type { MoveAnalysis, MoveClass, NodeEval, Side } from "./types";
import { parseTrail, type VariationTrail } from "./variations";

/** Separate from the explicit save list: the game currently open, kept across reloads. */
export const RESUME_STORAGE_KEY = "pablo.revue.current.v1";

const MAX_PLIES = 600;
const MOVE_CLASSES = new Set<MoveClass>(["best", "good", "ok", "inaccuracy", "mistake", "blunder"]);

export type ResumeSnapshot = {
  savedAt: string;
  pgn: string | null;
  fen: string | null;
  depth: number;
  ply: number;
  viewer: Side | null;
  orientation: Side;
  savedId: string | null;
  analyses: Array<MoveAnalysis | null>;
  nodeEvals: Array<NodeEval | null>;
  /** Explored lines. Absent on snapshots from before variations were kept. */
  trail?: VariationTrail;
};

export function readResume(storage: Pick<Storage, "getItem">): ResumeSnapshot | null {
  const raw = storage.getItem(RESUME_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return parseResume(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function writeResume(storage: Pick<Storage, "setItem">, snapshot: ResumeSnapshot) {
  storage.setItem(RESUME_STORAGE_KEY, JSON.stringify(snapshot));
}

export function clearResume(storage: Pick<Storage, "removeItem">) {
  storage.removeItem(RESUME_STORAGE_KEY);
}

export function parseResume(value: unknown): ResumeSnapshot | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Partial<ResumeSnapshot>;
  const pgn = row.pgn === null || typeof row.pgn === "string" ? row.pgn ?? null : undefined;
  const fen = row.fen === null || typeof row.fen === "string" ? row.fen ?? null : undefined;

  if (
    pgn === undefined ||
    fen === undefined ||
    (pgn === null && fen === null) ||
    typeof row.depth !== "number" ||
    typeof row.ply !== "number" ||
    !isSide(row.orientation) ||
    !isSideOrNull(row.viewer) ||
    (row.savedId !== null && typeof row.savedId !== "string") ||
    typeof row.savedAt !== "string" ||
    !Array.isArray(row.analyses) ||
    !Array.isArray(row.nodeEvals) ||
    row.analyses.length > MAX_PLIES ||
    row.nodeEvals.length > MAX_PLIES
  ) {
    return null;
  }

  if (!row.analyses.every(isMoveAnalysis) || !row.nodeEvals.every(isNodeEvalOrNull)) {
    return null;
  }

  const snapshot: ResumeSnapshot = {
    savedAt: row.savedAt,
    pgn,
    fen,
    depth: row.depth,
    ply: row.ply,
    viewer: row.viewer ?? null,
    orientation: row.orientation,
    savedId: row.savedId ?? null,
    analyses: row.analyses,
    nodeEvals: row.nodeEvals,
  };
  const trail = "trail" in row && row.trail != null ? parseTrail(row.trail) : null;

  if (trail) {
    snapshot.trail = trail;
  }

  return snapshot;
}

function isMoveAnalysis(value: unknown): value is MoveAnalysis | null {
  if (value === null) {
    return true;
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  const row = value as Partial<MoveAnalysis>;
  return (
    typeof row.ply === "number" &&
    isSide(row.color) &&
    typeof row.classification === "string" &&
    MOVE_CLASSES.has(row.classification) &&
    typeof row.cpLoss === "number" &&
    typeof row.accuracy === "number" &&
    (row.bestUci === null || typeof row.bestUci === "string") &&
    (row.bestSan === null || typeof row.bestSan === "string") &&
    typeof row.pvSan === "string" &&
    isNodeEval(row.before) &&
    isNodeEval(row.after)
  );
}

function isNodeEvalOrNull(value: unknown): value is NodeEval | null {
  return value === null || isNodeEval(value);
}

function isNodeEval(value: unknown): value is NodeEval {
  if (!value || typeof value !== "object") {
    return false;
  }

  const row = value as Partial<NodeEval>;
  return typeof row.cp === "number" && (row.mate === null || typeof row.mate === "number");
}

function isSide(value: unknown): value is Side {
  return value === "w" || value === "b";
}

function isSideOrNull(value: unknown): value is Side | null {
  return value === null || value === undefined || isSide(value);
}
