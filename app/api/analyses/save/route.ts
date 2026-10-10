import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { accountsUnavailableResponse } from "@/lib/accounts-response";
import { accountsConfigured, ensureSchema, getPool } from "@/lib/db";
import { isSampleUsername } from "@/lib/sample-games";
import type {
  OpeningPlayed,
  OpeningsAnalysisResult,
} from "@/app/api/analyze/openings/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SaveBody = {
  result?: OpeningsAnalysisResult;
  chessUsername?: unknown;
  sample?: unknown;
};

function playedOpenings(result: OpeningsAnalysisResult): OpeningPlayed[] {
  const source =
    Array.isArray(result.openings) && result.openings.length > 0
      ? result.openings
      : (result.weaknesses ?? []).map((weakness) => ({
          opening: weakness.opening,
          color: weakness.color,
          winRate: weakness.winRate,
          gameCount: weakness.gameCount,
          wins: Math.round((weakness.winRate / 100) * weakness.gameCount),
          losses: 0,
          draws: Math.max(
            0,
            weakness.gameCount - Math.round((weakness.winRate / 100) * weakness.gameCount),
          ),
        }));

  return source.filter(
    (opening) =>
      opening &&
      typeof opening.opening === "string" &&
      opening.opening.trim().length > 0 &&
      (opening.color === "white" || opening.color === "black") &&
      Number.isFinite(opening.gameCount) &&
      opening.gameCount > 0,
  );
}

export async function POST(request: NextRequest) {
  if (!accountsConfigured()) {
    return accountsUnavailableResponse();
  }

  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    console.error("Save auth lookup failed", error instanceof Error ? error.message : "");
    return Response.json(
      { error: "Account storage is unavailable. Set DATABASE_URL and try again." },
      { status: 503 },
    );
  }
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: SaveBody;
  try {
    body = (await request.json()) as SaveBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = body.result;
  const chessUsername =
    typeof body.chessUsername === "string" && body.chessUsername.trim()
      ? body.chessUsername.trim()
      : result?.username ?? "";

  if (!result || !chessUsername || !Number.isFinite(result.gameCount)) {
    return Response.json({ error: "Missing result or chessUsername" }, { status: 400 });
  }

  if (body.sample === true || isSampleUsername(chessUsername)) {
    return Response.json(
      { error: "Sample reports stay off your account." },
      { status: 400 },
    );
  }

  const openings = playedOpenings(result);
  const breakdown = openings.map((opening) => ({
    opening: opening.opening,
    color: opening.color,
    winRate: opening.winRate,
    gameCount: opening.gameCount,
  }));

  try {
    await ensureSchema();
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        `${user.id}:${result.summary ?? ""}:${result.gameCount}`,
      ]);

      const recent = await client.query<{ id: string }>(
        `SELECT id FROM analyses
         WHERE user_id = $1
           AND chess_com_username = $2
           AND pablo_summary = $3
           AND total_games = $4
           AND run_at > NOW() - INTERVAL '20 seconds'
         ORDER BY run_at DESC
         LIMIT 1`,
        [user.id, chessUsername, result.summary ?? "", result.gameCount],
      );

      let analysisId = recent.rows[0]?.id;
      if (!analysisId) {
        const inserted = await client.query<{ id: string }>(
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
            JSON.stringify(breakdown),
            result.summary ?? "",
          ],
        );
        analysisId = inserted.rows[0]?.id;
      }

      for (const opening of openings) {
        await client.query(
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
            opening.opening,
            opening.color,
            opening.gameCount,
            opening.wins,
            opening.winRate,
          ],
        );
      }

      if (!user.chess_com_username) {
        await client.query(
          `UPDATE users
           SET chess_com_username = $1, last_seen = NOW()
           WHERE id = $2 AND chess_com_username IS NULL`,
          [chessUsername, user.id],
        );
      } else {
        await client.query("UPDATE users SET last_seen = NOW() WHERE id = $1", [user.id]);
      }

      await client.query("COMMIT");
      return Response.json({ ok: true, analysisId, openingsSaved: openings.length });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Failed to save analysis", error instanceof Error ? error.message : "");
    return Response.json({ error: "Couldn't save this analysis." }, { status: 500 });
  }
}
