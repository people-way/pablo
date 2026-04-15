import type { NextRequest } from "next/server";
import type { ImportedChessComGame } from "@/lib/chess-com";
import { findCatalogOpening } from "@/lib/openings/lookup";

export const runtime = "nodejs";

const MIN_GAMES_FOR_WEAKNESS = 3;
const MAX_WEAKNESSES = 3;

type GameColor = "white" | "black";

type OpeningGroup = {
  opening: string;
  color: GameColor;
  wins: number;
  losses: number;
  draws: number;
  dates: string[];
};

export type OpeningWeakness = {
  opening: string;
  color: GameColor;
  winRate: number;
  gameCount: number;
  diagnosis: string;
  keyProblem: string;
  whatToDo: string;
};

export type OpeningsAnalysisResult = {
  gameCount: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  dateRange: { from: string; to: string } | null;
  weaknesses: OpeningWeakness[];
  summary: string;
  username: string;
};

export async function POST(request: NextRequest) {
  let payload: { games?: unknown; username?: unknown };

  try {
    payload = (await request.json()) as { games?: unknown; username?: unknown };
  } catch {
    return Response.json(
      { error: { code: "invalid_json", message: "Send a JSON body with { games: [...] }." } },
      { status: 400 },
    );
  }

  if (!Array.isArray(payload.games)) {
    return Response.json(
      { error: { code: "missing_games", message: "Provide a games array." } },
      { status: 400 },
    );
  }

  const games = payload.games as ImportedChessComGame[];
  const username = typeof payload.username === "string" ? payload.username : "you";

  if (games.length < 1) {
    return Response.json(
      { error: { code: "no_games", message: "No games to analyze." } },
      { status: 422 },
    );
  }

  const result = analyzeOpenings(games, username);
  return Response.json(result);
}

function analyzeOpenings(games: ImportedChessComGame[], username: string): OpeningsAnalysisResult {
  // Overall stats
  let wins = 0;
  let losses = 0;
  let draws = 0;
  const dates: string[] = [];

  for (const g of games) {
    if (g.result === "win") wins++;
    else if (g.result === "loss") losses++;
    else draws++;
    if (g.date) dates.push(g.date);
  }

  const total = games.length;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  let dateRange: { from: string; to: string } | null = null;
  if (dates.length > 0) {
    const sorted = [...dates].sort();
    dateRange = { from: sorted[0], to: sorted[sorted.length - 1] };
  }

  // Group by opening family + color
  const groups = new Map<string, OpeningGroup>();

  for (const g of games) {
    const openingName = g.openingFamily || g.openingName || "Unknown Opening";
    const color = g.color;
    const key = `${openingName}::${color}`;

    if (!groups.has(key)) {
      groups.set(key, { opening: openingName, color, wins: 0, losses: 0, draws: 0, dates: [] });
    }

    const grp = groups.get(key)!;
    if (g.result === "win") grp.wins++;
    else if (g.result === "loss") grp.losses++;
    else grp.draws++;
    if (g.date) grp.dates.push(g.date);
  }

  // Find weaknesses: groups with enough games and low win rate
  const weaknesses: OpeningWeakness[] = [];

  for (const grp of groups.values()) {
    const grpTotal = grp.wins + grp.losses + grp.draws;
    if (grpTotal < MIN_GAMES_FOR_WEAKNESS) continue;

    const grpWinRate = Math.round((grp.wins / grpTotal) * 100);

    // Only flag openings with < 50% win rate as weaknesses
    if (grpWinRate < 50) {
      const catalogEntry = findCatalogOpening(null, grp.opening);
      const { diagnosis, keyProblem, whatToDo } = generateDiagnosis(
        grp.opening,
        grp.color,
        grpWinRate,
        grpTotal,
        catalogEntry,
      );

      weaknesses.push({
        opening: grp.opening,
        color: grp.color,
        winRate: grpWinRate,
        gameCount: grpTotal,
        diagnosis,
        keyProblem,
        whatToDo,
      });
    }
  }

  // Sort by win rate ascending (worst first), then by game count descending
  weaknesses.sort((a, b) => {
    if (a.winRate !== b.winRate) return a.winRate - b.winRate;
    return b.gameCount - a.gameCount;
  });

  const topWeaknesses = weaknesses.slice(0, MAX_WEAKNESSES);

  const summary = generateSummary(username, total, winRate, topWeaknesses);

  return {
    gameCount: total,
    wins,
    losses,
    draws,
    winRate,
    dateRange,
    weaknesses: topWeaknesses,
    summary,
    username,
  };
}

type CatalogEntry = ReturnType<typeof findCatalogOpening>;

function generateDiagnosis(
  opening: string,
  color: GameColor,
  winRate: number,
  gameCount: number,
  catalogEntry: CatalogEntry,
): { diagnosis: string; keyProblem: string; whatToDo: string } {
  const colorLabel = color === "white" ? "as White" : "as Black";
  const winRateLabel = `${winRate}%`;
  const gamesLabel = gameCount === 1 ? "1 game" : `${gameCount} games`;

  // Severity tier
  const severity = winRate < 25 ? "critical" : winRate < 35 ? "bad" : "below-average";

  // Use catalog data if available
  const pabloOpinion = catalogEntry?.pablo_opinion ?? null;
  const commonMistakes = catalogEntry?.common_mistakes_club_players ?? [];
  const typicalPlan =
    color === "white"
      ? (catalogEntry?.typical_white_plan ?? null)
      : (catalogEntry?.typical_black_plan ?? null);

  // Build diagnosis
  let diagnosis: string;
  if (severity === "critical") {
    diagnosis = `${opening} ${colorLabel} is not a problem — it's a crisis. ${winRateLabel} across ${gamesLabel} tells me you're walking into these positions without a real plan. You know the first few moves, then your opponents take over. This is the opening costing you the most points right now.`;
  } else if (severity === "bad") {
    diagnosis = `I've seen your ${opening} games ${colorLabel}, and the pattern is consistent. A ${winRateLabel} win rate across ${gamesLabel} isn't bad luck. You're reaching the middlegame at a structural disadvantage and you probably don't even notice it happening. That's fixable — but you have to name the problem first.`;
  } else {
    diagnosis = `Your ${opening} results ${colorLabel} — ${winRateLabel} across ${gamesLabel} — are dragging your overall performance down. You're not losing because your opponent is stronger. You're losing because you don't know your exact plan in this structure, and your moves become generic when the theory runs out.`;
  }

  // Append pablo opinion if available
  if (pabloOpinion) {
    diagnosis += ` Here's my take: ${pabloOpinion.charAt(0).toLowerCase()}${pabloOpinion.slice(1)}`;
  }

  // Key problem
  let keyProblem: string;
  if (commonMistakes.length > 0) {
    keyProblem = commonMistakes[0];
  } else if (severity === "critical") {
    keyProblem = `You're not reaching a playable middlegame — the position is already lost on the board before move 15. The ${opening} ${colorLabel} requires knowing your specific plans, and right now you're improvising from move 5.`;
  } else {
    keyProblem = `Your piece coordination breaks down around move 10–15 in the ${opening} ${colorLabel}. You reach positions where you don't have a clear plan and your opponent does. That imbalance decides the game before the real fight begins.`;
  }

  // What to do
  let whatToDo: string;
  if (typicalPlan) {
    whatToDo = `Focus on one thing: understand your typical plan in this structure. ${typicalPlan} Start there — master this one plan before worrying about variations.`;
  } else if (color === "white") {
    whatToDo = `Study 5 master games in the ${opening} from White's perspective. Find the one plan that appears in every game and make that your default. Openings are about plans, not moves.`;
  } else {
    whatToDo = `Find the counterplay that Black is supposed to generate in the ${opening}. You need a concrete plan — a pawn break, a piece maneuver, something specific — not just "develop and see what happens."`;
  }

  return { diagnosis, keyProblem, whatToDo };
}

function generateSummary(
  username: string,
  gameCount: number,
  overallWinRate: number,
  weaknesses: OpeningWeakness[],
): string {
  const gamesLabel = gameCount === 1 ? "1 game" : `${gameCount} games`;

  if (weaknesses.length === 0) {
    return `I looked at your last ${gamesLabel} and honestly? Your opening choices are solid. You're not bleeding points in any specific system — the losses you're taking are coming from the middlegame and endgame, where the real chess happens. That's actually the harder problem to fix, but it's also where the biggest gains are. Come back when you have more games and I'll dig deeper. — Pablo`;
  }

  const worstOpening = weaknesses[0];
  const worstLabel = `${worstOpening.opening} as ${worstOpening.color === "white" ? "White" : "Black"}`;

  if (overallWinRate >= 50) {
    return `You're winning more than you're losing overall — good. But there's a leak in your game that's costing you more than you realize. Your ${worstLabel} is a structural weakness: ${worstOpening.winRate}% in ${worstOpening.gameCount} games. Players at your level will keep exploiting this exact pattern until you fix it. The good news is that opening preparation is the most learnable part of chess — one focused week on this and you'll see the difference immediately. I've mapped out exactly what you need. — Pablo`;
  }

  if (weaknesses.length >= 2) {
    const secondLabel = `${weaknesses[1].opening} as ${weaknesses[1].color === "white" ? "White" : "Black"}`;
    return `I've gone through your ${gamesLabel} and there are two openings that stand out as serious problems: ${worstLabel} (${worstOpening.winRate}%) and ${secondLabel} (${weaknesses[1].winRate}%). These aren't the only issues, but fixing these two would have the biggest immediate impact on your results. You're capable of better than this — I've seen the flashes. The gap between your potential and your current results is almost entirely an opening preparation problem. Let's fix that. — Pablo`;
  }

  return `${gamesLabel} analyzed, and the picture is clear: your ${worstLabel} is the main thing holding you back right now. A ${worstOpening.winRate}% win rate across ${worstOpening.gameCount} games is not variance — it's a pattern. Every time you reach this position, something specific goes wrong, and until you understand what that is, it will keep happening. I know exactly what the fix looks like. The full prep plan covers the critical moves, your typical mistakes in this structure, and a specific study sequence that will take you maybe 3 hours to complete. — Pablo`;
}
