import { Chess } from "chess.js";
import type { NextRequest } from "next/server";

const CHESS_COM_BASE = "https://api.chess.com/pub/player";
const USER_AGENT = "PabloRevue/1.0 (personal chess review; +https://github.com/people-way/pablo)";
const GAME_LIMIT = 12;

type ChessComPlayer = {
  username?: string;
  rating?: number;
  result?: string;
};

type ChessComGame = {
  url?: string;
  pgn?: string;
  end_time?: number;
  time_control?: string;
  time_class?: string;
  rules?: string;
  white?: ChessComPlayer;
  black?: ChessComPlayer;
};

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username")?.trim() ?? "";

  if (!/^[A-Za-z0-9_-]{2,25}$/.test(username)) {
    return Response.json(
      { error: "Indique un pseudo Chess.com (lettres, chiffres, _ ou -)." },
      { status: 400 },
    );
  }

  try {
    const archives = await fetchJson<{ archives?: string[] }>(
      `${CHESS_COM_BASE}/${encodeURIComponent(username)}/games/archives`,
    );
    const archiveUrls = [...(archives.archives ?? [])].reverse();

    if (archiveUrls.length === 0) {
      return Response.json(
        { error: `Aucune archive publique pour « ${username} ».` },
        { status: 404 },
      );
    }

    const games = [];

    for (const archiveUrl of archiveUrls) {
      const month = await fetchJson<{ games?: ChessComGame[] }>(archiveUrl);
      const standard = (month.games ?? [])
        .filter((game) => game.rules === "chess" && game.pgn)
        .sort((left, right) => (right.end_time ?? 0) - (left.end_time ?? 0));

      for (const game of standard) {
        const slim = toPublicGame(game);

        if (slim) {
          games.push(slim);
        }

        if (games.length >= GAME_LIMIT) {
          break;
        }
      }

      if (games.length >= GAME_LIMIT) {
        break;
      }
    }

    if (games.length === 0) {
      return Response.json(
        { error: `Aucune partie classique récente pour « ${username} ».` },
        { status: 404 },
      );
    }

    return Response.json({ username, games });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chess.com est injoignable.";
    const status = message.includes("introuvable") ? 404 : 502;
    return Response.json({ error: message }, { status });
  }
}

function toPublicGame(game: ChessComGame) {
  const pgn = game.pgn?.trim();

  if (!pgn) {
    return null;
  }

  const chess = new Chess();

  try {
    chess.loadPgn(pgn);
  } catch {
    return null;
  }

  const headers = chess.getHeaders();
  const white = game.white?.username || headers.White || "Blanc";
  const black = game.black?.username || headers.Black || "Noir";

  return {
    id: game.url || `${game.end_time ?? 0}-${white}-${black}`,
    url: game.url ?? null,
    pgn,
    white,
    black,
    whiteRating: game.white?.rating ?? null,
    blackRating: game.black?.rating ?? null,
    result: headers.Result || "*",
    endTime: game.end_time ?? null,
    timeClass: game.time_class ?? null,
    timeControl: game.time_control ?? null,
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
    });
  } catch {
    throw new Error("Impossible de joindre Chess.com pour le moment.");
  }

  if (response.status === 404) {
    throw new Error("Joueur Chess.com introuvable.");
  }

  if (response.status === 429) {
    throw new Error("Chess.com limite les requêtes. Réessaie dans une minute.");
  }

  if (!response.ok) {
    throw new Error("Chess.com a renvoyé une erreur.");
  }

  return (await response.json()) as T;
}
