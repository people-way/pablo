export type ColorName = "white" | "black";

export type LineStats = {
  games: number;
  wins: number;
  draws: number;
  losses: number;
  /** (wins + ½ draws) / games, in percent. */
  scorePct: number;
  /** Wins / games, in percent. Matches pablo_opening_stats.win_rate. */
  winRate: number;
  avgAccuracy: number | null;
  accuracyGames: number;
};

export type TreeNode = {
  id: string;
  san: string | null;
  ply: number;
  byUser: boolean;
  fen: string;
  openingName: string;
  variation: string | null;
  inBookShare: number;
  userExits: number;
  opponentExits: number;
  rareGames: number;
  stats: LineStats;
  children: TreeNode[];
};

export type WeaknessKind = "bad-result" | "early-exit" | "opponent-reply" | "early-signal";

export type LineDrill = {
  orientation: "w" | "b";
  /** Played line, for replay. */
  replaySans: string[];
  /** Moves to reach the position where the user has to find the coup. */
  setupSans: string[];
  quizSan: string | null;
};

export type OpeningWeakness = {
  id: string;
  color: ColorName;
  kind: WeaknessKind;
  openingName: string;
  variation: string | null;
  line: string;
  sans: string[];
  fen: string;
  ply: number;
  playedSan: string;
  playedByUser: boolean;
  insteadSan: string | null;
  stats: LineStats;
  userExits: number;
  diagnosis: string;
  whatToPlay: string;
  idea: string;
  drill: LineDrill;
  sampleUrl: string | null;
};

export type OpeningFamily = {
  opening: string;
  color: ColorName;
  gameCount: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  scorePct: number;
};

export type OpeningAnchor = {
  color: ColorName;
  openingName: string;
  stats: LineStats;
};

export type ColorRepertoire = {
  stats: LineStats;
  tree: TreeNode;
};

export type RepertoireReport = {
  username: string;
  months: number;
  archives: string[];
  periodLabel: string;
  fetchedAt: string;
  fetchedGames: number;
  gameCount: number;
  skippedShort: number;
  skippedBullet: number;
  skippedVariant: number;
  skippedUnread: number;
  capped: boolean;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  scorePct: number;
  dateRange: { from: string; to: string } | null;
  rating: { latest: number | null; average: number | null };
  summary: string;
  colors: Record<ColorName, ColorRepertoire>;
  weaknesses: OpeningWeakness[];
  anchors: OpeningAnchor[];
  families: OpeningFamily[];
};

export type AnalysisSaveResult = {
  username: string;
  gameCount: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  dateRange: { from: string; to: string } | null;
  summary: string;
  openings: Array<{
    opening: string;
    color: ColorName;
    gameCount: number;
    wins: number;
    winRate: number;
  }>;
};
