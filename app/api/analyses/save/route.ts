import type { NextRequest } from "next/server";
import { getCurrentUser, updateChessUsername } from "@/lib/auth";
import { query } from "@/lib/db";
import type { OpeningsAnalysisResult } from "@/app/api/analyze/openings/route";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { result?: unknown; chessUsername?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = body.result as OpeningsAnalysisResult;
  const chessUsername =
    typeof body.chessUsername === "string" ? body.chessUsername : result?.username ?? "";

  if (!result || !chessUsername) {
    return Response.json({ error: "Missing result or chessUsername" }, { status: 400 });
  }

  // Update user's chess.com username if not set
  if (!user.chess_com_username && chessUsername) {
    await updateChessUsername(user.id, chessUsername);
  }

  // Save the analysis
  const rows = await query<{ id: string }>(
    `INSERT INTO analyses
       (user_id, chess_com_username, total_games, wins, losses, draws, win_rate,
        date_range_from, date_range_to, opening_breakdown, pablo_summary)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [
      user.id,
      chessUsername,
      result.gameCount,
      result.wins,
      result.losses,
      result.draws,
      result.winRate,
      result.dateRange?.from ?? null,
      result.dateRange?.to ?? null,
      JSON.stringify(result.weaknesses),
      result.summary,
    ],
  );

  const analysisId = rows[0]?.id;

  // Upsert opening_stats for each weakness (and strong openings can be added later)
  // For now we save what we have from weaknesses
  for (const w of result.weaknesses) {
    await query(
      `INSERT INTO opening_stats
         (user_id, chess_com_username, opening_family, color, games_played, wins, win_rate)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, chess_com_username, opening_family, color)
       DO UPDATE SET
         games_played = EXCLUDED.games_played,
         wins = EXCLUDED.wins,
         win_rate = EXCLUDED.win_rate,
         last_updated = NOW()`,
      [
        user.id,
        chessUsername,
        w.opening,
        w.color,
        w.gameCount,
        Math.round((w.winRate / 100) * w.gameCount),
        w.winRate,
      ],
    );
  }

  return Response.json({ ok: true, analysisId });
}
