import type { NextRequest } from "next/server";
import { ChessComImportError, importChessComRepertoireGames } from "@/lib/chess-com";
import { normalizeChessComUsername } from "@/lib/account-guards";
import { buildRepertoire, type RepertoireGame } from "@/lib/openings/repertoire";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const username = normalizeChessComUsername(request.nextUrl.searchParams.get("username"));
  const months = clampMonths(request.nextUrl.searchParams.get("months"));

  if (!username) {
    return Response.json(
      {
        error: {
          code: "missing_username",
          message: "Indique un pseudo Chess.com (3 à 25 caractères).",
        },
      },
      { status: 400 },
    );
  }

  try {
    const imported = await importChessComRepertoireGames(username, {
      archiveMonths: months,
      limit: 500,
    });
    const games: RepertoireGame[] = imported.games.map((game) => ({
      pgn: game.pgn,
      color: game.color,
      result: game.result,
      date: game.date,
      accuracy: game.accuracy,
      timeClass: game.timeClass,
      rules: game.rules,
      url: game.url,
      playerRating: game.playerRating,
    }));
    const report = buildRepertoire(games, {
      username,
      months,
      archives: imported.archives,
      skippedBullet: imported.skippedBullet,
      skippedVariant: imported.skippedVariant,
      capped: imported.capped,
    });

    if (report.gameCount < 1) {
      return Response.json(
        {
          error: {
            code: "no_games",
            message:
              "Pas assez de parties de blitz, de rapide ou de longue durée sur cette période. Les bullets ne comptent pas.",
          },
        },
        { status: 404 },
      );
    }

    return Response.json(report);
  } catch (error) {
    if (error instanceof ChessComImportError) {
      return Response.json(
        { error: { code: error.code, message: frenchImportError(error) } },
        { status: error.status },
      );
    }

    return Response.json(
      { error: { code: "internal_error", message: "Le répertoire n'a pas pu être construit." } },
      { status: 500 },
    );
  }
}

function clampMonths(value: string | null) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return 9;
  }
  return Math.min(12, Math.max(6, parsed));
}

function frenchImportError(error: ChessComImportError) {
  if (error.code === "user_not_found") {
    return "Je ne trouve pas ce pseudo sur Chess.com.";
  }
  if (error.code === "rate_limited") {
    return "Chess.com limite les requêtes. Réessaie dans une minute.";
  }
  if (error.code === "no_games" || error.code === "missing_username") {
    return error.message;
  }
  return "Chess.com ne répond pas. Réessaie.";
}
