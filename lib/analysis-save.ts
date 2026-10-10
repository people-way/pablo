import { normalizeChessComUsername } from "./account-guards";
import { isSampleUsername } from "./sample-games";

type OpeningColor = "white" | "black";

export type AnalysisSaveBody = {
  result?: {
    username?: unknown;
    gameCount?: unknown;
    wins?: unknown;
    losses?: unknown;
    draws?: unknown;
    winRate?: unknown;
    dateRange?: { from?: unknown; to?: unknown } | null;
    summary?: unknown;
    openings?: unknown;
    weaknesses?: unknown;
  };
  chessUsername?: unknown;
  sample?: unknown;
};

export type PreparedOpening = {
  opening: string;
  color: OpeningColor;
  gameCount: number;
  wins: number;
  winRate: number;
};

export type PreparedAnalysisSave = {
  chessUsername: string;
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  dateFrom: string | null;
  dateTo: string | null;
  summary: string;
  breakdown: {
    opening: string;
    color: OpeningColor;
    winRate: number;
    gameCount: number;
  }[];
  openings: PreparedOpening[];
};

function asCount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (rounded < 0 || rounded > 10000) return null;
  return rounded;
}

function asRate(value: unknown): number | null {
  const count = asCount(value);
  if (count === null || count > 100) return null;
  return count;
}

function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function playedOpenings(result: NonNullable<AnalysisSaveBody["result"]>): PreparedOpening[] {
  const openings = Array.isArray(result.openings) ? result.openings : [];
  const weaknesses = Array.isArray(result.weaknesses) ? result.weaknesses : [];
  const source =
    openings.length > 0
      ? openings
      : weaknesses.map((weakness) => {
          const row = weakness as {
            opening?: unknown;
            color?: unknown;
            winRate?: unknown;
            gameCount?: unknown;
          };
          const gameCount = asCount(row.gameCount) ?? 0;
          const winRate = asRate(row.winRate) ?? 0;
          const wins = Math.round((winRate / 100) * gameCount);
          return {
            opening: row.opening,
            color: row.color,
            winRate,
            gameCount,
            wins,
          };
        });

  const prepared: PreparedOpening[] = [];
  for (const item of source) {
    const row = item as {
      opening?: unknown;
      color?: unknown;
      winRate?: unknown;
      gameCount?: unknown;
      wins?: unknown;
    };
    const opening = asText(row.opening);
    const gameCount = asCount(row.gameCount);
    const winRate = asRate(row.winRate);
    const wins = asCount(row.wins);
    if (!opening || opening.length > 120 || gameCount === null || gameCount <= 0) continue;
    if (winRate === null || wins === null) continue;
    if (row.color !== "white" && row.color !== "black") continue;
    prepared.push({
      opening,
      color: row.color,
      gameCount,
      wins,
      winRate,
    });
  }
  return prepared;
}

export function prepareAnalysisSave(
  body: AnalysisSaveBody,
): { ok: true; save: PreparedAnalysisSave } | { ok: false; status: 400; error: string } {
  const result = body.result;
  const explicitName = asText(body.chessUsername);
  const resultName = asText(result?.username);
  const chessUsername = normalizeChessComUsername(explicitName || resultName || "");

  if (!result || !chessUsername || asCount(result.gameCount) === null) {
    return { ok: false, status: 400, error: "Missing result or chessUsername" };
  }
  if (body.sample === true || isSampleUsername(chessUsername)) {
    return { ok: false, status: 400, error: "Sample reports stay off your account." };
  }

  const totalGames = asCount(result.gameCount);
  const wins = asCount(result.wins);
  const losses = asCount(result.losses);
  const draws = asCount(result.draws);
  const winRate = asRate(result.winRate);
  if (
    totalGames === null ||
    wins === null ||
    losses === null ||
    draws === null ||
    winRate === null
  ) {
    return { ok: false, status: 400, error: "Missing result or chessUsername" };
  }

  const openings = playedOpenings(result);
  const dateFrom = asText(result.dateRange?.from);
  const dateTo = asText(result.dateRange?.to);

  return {
    ok: true,
    save: {
      chessUsername,
      totalGames,
      wins,
      losses,
      draws,
      winRate,
      dateFrom,
      dateTo,
      summary: typeof result.summary === "string" ? result.summary : "",
      breakdown: openings.map((opening) => ({
        opening: opening.opening,
        color: opening.color,
        winRate: opening.winRate,
        gameCount: opening.gameCount,
      })),
      openings,
    },
  };
}
