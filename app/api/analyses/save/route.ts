import type { NextRequest } from "next/server";
import { prepareAnalysisSave } from "@/lib/analysis-save";
import { AccountStorageError, getCurrentUser } from "@/lib/auth";
import { accountsUnavailableResponse } from "@/lib/accounts-response";
import { createClient } from "@/lib/supabase/server";
import { accountsConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!accountsConfigured()) {
    return accountsUnavailableResponse();
  }

  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    console.error(
      "Save auth lookup failed",
      error instanceof AccountStorageError ? error.message : "",
    );
    return Response.json(
      { error: "Account storage is unavailable. Check the Supabase settings and try again." },
      { status: 503 },
    );
  }
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const prepared = prepareAnalysisSave(
    body && typeof body === "object" ? (body as Parameters<typeof prepareAnalysisSave>[0]) : {},
  );
  if (!prepared.ok) {
    return Response.json({ error: prepared.error }, { status: prepared.status });
  }

  const save = prepared.save;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("pablo_save_analysis", {
      p_chess_username: save.chessUsername,
      p_total_games: save.totalGames,
      p_wins: save.wins,
      p_losses: save.losses,
      p_draws: save.draws,
      p_win_rate: save.winRate,
      p_date_range_from: save.dateFrom,
      p_date_range_to: save.dateTo,
      p_opening_breakdown: save.breakdown,
      p_summary: save.summary,
      p_openings: save.openings,
    });
    if (error) throw new AccountStorageError(error.message);
    return Response.json({
      ok: true,
      analysisId: data,
      openingsSaved: save.openings.length,
    });
  } catch (error) {
    console.error(
      "Failed to save analysis",
      error instanceof Error ? error.message : "",
    );
    return Response.json({ error: "Couldn't save this analysis." }, { status: 500 });
  }
}
