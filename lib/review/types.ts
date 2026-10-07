export type Side = "w" | "b";

/** Evaluation from White's point of view. Mate is signed: positive means White is mating. */
export type NodeEval = {
  cp: number;
  mate: number | null;
};

export type MoveClass =
  | "best"
  | "good"
  | "ok"
  | "inaccuracy"
  | "mistake"
  | "blunder";

export type MoveAnalysis = {
  ply: number;
  color: Side;
  classification: MoveClass;
  cpLoss: number;
  accuracy: number;
  bestUci: string | null;
  bestSan: string | null;
  pvSan: string;
  before: NodeEval;
  after: NodeEval;
};

export type PlayerSummary = {
  color: Side;
  moves: number;
  blunders: number;
  mistakes: number;
  inaccuracies: number;
  best: number;
  good: number;
  accuracy: number | null;
  acpl: number | null;
};

export type ParsedMove = {
  ply: number;
  moveNumber: number;
  san: string;
  uci: string;
  color: Side;
  fenBefore: string;
  fenAfter: string;
};

export type ParsedGame = {
  white: string;
  black: string;
  result: string;
  date: string;
  event: string;
  opening: string;
  startFen: string;
  moves: ParsedMove[];
};

export type SavedReview = {
  id: string;
  savedAt: string;
  title: string;
  white: string;
  black: string;
  result: string;
  date: string;
  pgn: string | null;
  fen: string | null;
  depth: number;
  ply: number;
  viewer: Side | null;
  analyses: Array<MoveAnalysis | null>;
  nodeEvals: Array<NodeEval | null>;
};
