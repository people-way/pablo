import type { NextRequest } from "next/server";
import {
  ChessComImportError,
  importRecentChessComGames,
} from "@/lib/chess-com";

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username")?.trim();

  if (!username) {
    return Response.json(
      {
        error: {
          code: "missing_username",
          message: "Provide a Chess.com username with ?username=your-name.",
        },
      },
      { status: 400 },
    );
  }

  try {
    const result = await importRecentChessComGames(username);

    return Response.json({
      source: "chess.com",
      username: result.username,
      archive: result.archive,
      count: result.games.length,
      games: result.games,
    });
  } catch (error) {
    if (error instanceof ChessComImportError) {
      return Response.json(
        {
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: error.status },
      );
    }

    return Response.json(
      {
        error: {
          code: "internal_error",
          message: "Something went wrong while importing games.",
        },
      },
      { status: 500 },
    );
  }
}
