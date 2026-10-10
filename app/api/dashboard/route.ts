import { AccountStorageError, getCurrentUser } from "@/lib/auth";
import { accountsUnavailablePayload } from "@/lib/accounts-response";
import { createClient } from "@/lib/supabase/server";
import { accountsConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnalysisRow = {
  id: string;
  chess_com_username: string;
  run_at: string;
  total_games: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number;
  opening_breakdown: unknown;
  pablo_summary: string;
};

type OpeningStatRow = {
  opening_family: string;
  color: string;
  games_played: number;
  wins: number;
  win_rate: number;
  last_updated: string;
};

export type MasteryLevel = 1 | 2 | 3 | 4 | 5;
export type MasteryInfo = {
  level: MasteryLevel;
  label: string;
  color: string;
};

export type OpeningCard = {
  opening: string;
  color: string;
  winRate: number;
  gamesPlayed: number;
  mastery: MasteryInfo;
  badge: string | null;
  history: { runAt: string; winRate: number }[];
};

export type DashboardData = {
  user: { email: string; chess_com_username: string | null };
  streak: number;
  totalAnalyses: number;
  lastAnalysisAt: string | null;
  openingCards: OpeningCard[];
  recentSummary: string | null;
  badges: string[];
};

function getMastery(winRate: number): MasteryInfo {
  if (winRate < 40) return { level: 1, label: "Danger Zone", color: "#ff7070" };
  if (winRate < 50) return { level: 2, label: "Building", color: "#e8a84c" };
  if (winRate < 60) return { level: 3, label: "Solid", color: "#c9a84c" };
  if (winRate < 70) return { level: 4, label: "Strong", color: "#8ce0ac" };
  return { level: 5, label: "Mastered", color: "#4bff8a" };
}

const BADGE_MAP: Record<string, string> = {
  Sicilian: "Sicilian Survivor",
  London: "London Legend",
  "Caro-Kann": "Caro-Kann Knight",
  French: "French Fortress",
  "King's Indian": "King's Indian Warrior",
  "Ruy Lopez": "Ruy Lopez Royalty",
  Italian: "Italian Artist",
  "Queen's Gambit": "Queen's Gambit Champion",
  "King's Gambit": "King's Gambit Hero",
  English: "English Architect",
  Reti: "Réti Maestro",
  Dutch: "Dutch Defender",
  Pirc: "Pirc Pathfinder",
  Vienna: "Vienna Master",
  Scandinavian: "Scandinavian Striker",
};

function getBadge(opening: string, mastery: MasteryInfo): string | null {
  if (mastery.level < 4) return null;
  for (const key of Object.keys(BADGE_MAP)) {
    if (opening.includes(key)) return BADGE_MAP[key];
  }
  return `${opening} Expert`;
}

function computeStreak(analyses: { run_at: string }[]): number {
  if (analyses.length === 0) return 0;
  const dates = analyses
    .map((a) => new Date(a.run_at).toDateString())
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  if (dates[0] !== today && dates[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = Math.round((prev.getTime() - curr.getTime()) / 86400000);
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function breakdownItems(value: unknown): { opening: string; color: string; winRate: number }[] {
  let parsed = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (item): item is { opening: string; color: string; winRate: number } =>
      !!item &&
      typeof item === "object" &&
      typeof (item as { opening?: unknown }).opening === "string" &&
      typeof (item as { color?: unknown }).color === "string" &&
      typeof (item as { winRate?: unknown }).winRate === "number",
  );
}

export async function GET() {
  if (!accountsConfigured()) {
    return Response.json(accountsUnavailablePayload(), { status: 200 });
  }

  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    console.error(
      "Dashboard auth lookup failed",
      error instanceof AccountStorageError ? error.message : "",
    );
    return Response.json(
      { error: "Couldn't load your dashboard. Try again in a moment." },
      { status: 503 },
    );
  }
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  let analyses: AnalysisRow[];
  let openingStats: OpeningStatRow[];
  let totalCount = 0;
  try {
    const supabase = await createClient();
    const [analysisResult, statResult, countResult] = await Promise.all([
      supabase
        .from("pablo_analyses")
        .select(
          "id, chess_com_username, run_at, total_games, wins, losses, draws, win_rate, opening_breakdown, pablo_summary",
        )
        .eq("user_id", user.id)
        .order("run_at", { ascending: false })
        .limit(50),
      supabase
        .from("pablo_opening_stats")
        .select("opening_family, color, games_played, wins, win_rate, last_updated")
        .eq("user_id", user.id)
        .order("games_played", { ascending: false }),
      supabase
        .from("pablo_analyses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);
    if (analysisResult.error) throw new AccountStorageError(analysisResult.error.message);
    if (statResult.error) throw new AccountStorageError(statResult.error.message);
    if (countResult.error) throw new AccountStorageError(countResult.error.message);
    analyses = (analysisResult.data ?? []) as AnalysisRow[];
    openingStats = (statResult.data ?? []) as OpeningStatRow[];
    totalCount = countResult.count ?? analyses.length;
  } catch (error) {
    console.error(
      "Dashboard query failed",
      error instanceof Error ? error.message : "",
    );
    return Response.json(
      { error: "Couldn't load your dashboard. Try again in a moment." },
      { status: 503 },
    );
  }

  const streak = computeStreak(analyses);
  const lastAnalysis = analyses[0] ?? null;

  const openingHistory = new Map<string, { runAt: string; winRate: number }[]>();
  for (const analysis of [...analyses].reverse()) {
    for (const item of breakdownItems(analysis.opening_breakdown)) {
      const key = `${item.opening}::${item.color}`;
      if (!openingHistory.has(key)) openingHistory.set(key, []);
      openingHistory.get(key)!.push({
        runAt: analysis.run_at,
        winRate: item.winRate,
      });
    }
  }

  const openingCards: OpeningCard[] = openingStats.map((stat) => {
    const mastery = getMastery(stat.win_rate);
    const badge = getBadge(stat.opening_family, mastery);
    const key = `${stat.opening_family}::${stat.color}`;
    return {
      opening: stat.opening_family,
      color: stat.color,
      winRate: stat.win_rate,
      gamesPlayed: stat.games_played,
      mastery,
      badge,
      history: openingHistory.get(key) ?? [],
    };
  });

  const badges = openingCards.filter((c) => c.badge).map((c) => c.badge!);

  return Response.json({
    user: {
      email: user.email,
      chess_com_username: user.chess_com_username,
    },
    streak,
    totalAnalyses: totalCount,
    lastAnalysisAt: lastAnalysis?.run_at ?? null,
    openingCards,
    recentSummary: lastAnalysis?.pablo_summary ?? null,
    badges,
  } satisfies DashboardData);
}
