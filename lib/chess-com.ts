import {
  extractEcoCodeFromUrl,
  getOpeningLookup,
  normalizeEcoCode,
} from "@/lib/openings/lookup";

const CHESS_COM_BASE_URL = "https://api.chess.com/pub/player";
const CHESS_COM_USER_AGENT =
  "Pablo/1.0 (https://pablo.nanocorp.app; contact: support@pablo.nanocorp.app)";
const DEFAULT_ARCHIVE_MONTHS = 3;
const DEFAULT_IMPORT_LIMIT = 50;
const DRAW_RESULTS = new Set([
  "agreed",
  "draw",
  "insufficient",
  "repetition",
  "stalemate",
  "50move",
  "timevsinsufficient",
]);

type ChessComPlayer = {
  rating?: number;
  result?: string;
  username?: string;
};

type ChessComGame = {
  url?: string;
  pgn?: string;
  end_time?: number;
  time_control?: string;
  time_class?: string;
  rated?: boolean;
  rules?: string;
  white?: ChessComPlayer;
  black?: ChessComPlayer;
};

type ChessComArchivesResponse = {
  archives?: string[];
  message?: string;
};

type ChessComGamesResponse = {
  games?: ChessComGame[];
  message?: string;
};

export type ImportedChessComGame = {
  url: string | null;
  pgn: string;
  date: string | null;
  result: "win" | "loss" | "draw";
  resultDetail: string;
  timeControl: string | null;
  timeClass: string | null;
  opponent: string;
  opponentRating: number | null;
  color: "white" | "black";
  rated: boolean;
  rules: string | null;
  openingName: string | null;
  ecoCode: string | null;
  openingFamily: string;
};

export type ChessComImportResult = {
  username: string;
  archive: string;
  archives: string[];
  games: ImportedChessComGame[];
};

export class ChessComImportError extends Error {
  code: string;
  status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.name = "ChessComImportError";
    this.code = code;
    this.status = status;
  }
}

function normalizeUsername(value: string) {
  return value.trim();
}

function buildPlayerUrl(username: string, path: string) {
  return `${CHESS_COM_BASE_URL}/${encodeURIComponent(username)}${path}`;
}

function toImportError(status: number, fallbackMessage: string, message?: string) {
  if (status === 404) {
    return new ChessComImportError(
      "user_not_found",
      404,
      message ?? "Chess.com user not found.",
    );
  }

  if (status === 429) {
    return new ChessComImportError(
      "rate_limited",
      429,
      "Chess.com rate limit reached. Please try again in a minute.",
    );
  }

  return new ChessComImportError("upstream_error", 502, message ?? fallbackMessage);
}

async function fetchChessComJson<T>(url: string, fallbackMessage: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": CHESS_COM_USER_AGENT,
      },
    });
  } catch {
    throw new ChessComImportError(
      "network_error",
      502,
      "Unable to reach Chess.com right now. Please try again.",
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | null;

  if (!response.ok) {
    throw toImportError(response.status, fallbackMessage, payload?.message);
  }

  return payload as T;
}

function getArchiveLabel(archiveUrl: string) {
  const match = archiveUrl.match(/\/games\/(\d{4}\/\d{2})$/);
  return match?.[1] ?? "latest";
}

function normalizeResult(result: string | undefined): "win" | "loss" | "draw" {
  if (result === "win") {
    return "win";
  }

  if (result && DRAW_RESULTS.has(result)) {
    return "draw";
  }

  return "loss";
}

function parsePgnHeaders(pgn: string) {
  const headers = new Map<string, string>();

  for (const rawLine of pgn.split("\n")) {
    const line = rawLine.trim();

    if (!line.startsWith("[") || !line.endsWith("]")) {
      continue;
    }

    const match = line.match(/^\[(\w+)\s+"(.*)"\]$/);

    if (!match) {
      continue;
    }

    headers.set(match[1], match[2]);
  }

  return headers;
}

function extractOpeningMetadata(pgn: string) {
  const headers = parsePgnHeaders(pgn);
  const openingName = headers.get("Opening")?.trim() || null;
  const ecoCode =
    normalizeEcoCode(headers.get("ECO")) ??
    extractEcoCodeFromUrl(headers.get("ECOUrl")) ??
    null;
  const openingLookup = getOpeningLookup(ecoCode, openingName);

  return {
    openingName,
    ecoCode,
    openingFamily: openingLookup.name,
  };
}

function mapGame(username: string, game: ChessComGame): ImportedChessComGame | null {
  const normalizedUsername = username.toLowerCase();
  const whiteUsername = game.white?.username;
  const blackUsername = game.black?.username;

  const color =
    whiteUsername?.toLowerCase() === normalizedUsername
      ? "white"
      : blackUsername?.toLowerCase() === normalizedUsername
        ? "black"
        : null;

  if (!color) {
    return null;
  }

  const player = color === "white" ? game.white : game.black;
  const opponent = color === "white" ? game.black : game.white;
  const openingMetadata = extractOpeningMetadata(game.pgn ?? "");

  return {
    url: game.url ?? null,
    pgn: game.pgn ?? "",
    date: game.end_time ? new Date(game.end_time * 1000).toISOString() : null,
    result: normalizeResult(player?.result),
    resultDetail: player?.result ?? "unknown",
    timeControl: game.time_control ?? null,
    timeClass: game.time_class ?? null,
    opponent: opponent?.username ?? "Unknown opponent",
    opponentRating: opponent?.rating ?? null,
    color,
    rated: Boolean(game.rated),
    rules: game.rules ?? null,
    openingName: openingMetadata.openingName,
    ecoCode: openingMetadata.ecoCode,
    openingFamily: openingMetadata.openingFamily,
  };
}

function getRecentArchiveUrls(archives: string[] | undefined, archiveMonths: number) {
  return (archives ?? []).slice(-Math.max(archiveMonths, 1));
}

function getArchiveWindow(archiveUrls: string[]) {
  if (archiveUrls.length === 0) {
    return "latest";
  }

  const labels = archiveUrls.map((archiveUrl) => getArchiveLabel(archiveUrl));

  return labels.length === 1 ? labels[0] : `${labels[0]}–${labels.at(-1)}`;
}

export async function importRecentChessComGames(
  rawUsername: string,
  options?: {
    archiveMonths?: number;
    limit?: number;
  },
): Promise<ChessComImportResult> {
  const username = normalizeUsername(rawUsername);
  const archiveMonths = options?.archiveMonths ?? DEFAULT_ARCHIVE_MONTHS;
  const limit = options?.limit ?? DEFAULT_IMPORT_LIMIT;

  if (!username) {
    throw new ChessComImportError(
      "missing_username",
      400,
      "Provide a Chess.com username.",
    );
  }

  const archivesResponse = await fetchChessComJson<ChessComArchivesResponse>(
    buildPlayerUrl(username, "/games/archives"),
    "Unable to load Chess.com archives.",
  );

  const archiveUrls = getRecentArchiveUrls(archivesResponse.archives, archiveMonths);

  if (archiveUrls.length === 0) {
    throw new ChessComImportError(
      "no_games",
      404,
      `No public games found for "${username}".`,
    );
  }

  const gamesResponses = await Promise.all(
    archiveUrls.map((archiveUrl) =>
      fetchChessComJson<ChessComGamesResponse>(
        archiveUrl,
        "Unable to load the latest Chess.com games archive.",
      ),
    ),
  );

  const games = gamesResponses
    .flatMap((gamesResponse) => gamesResponse.games ?? [])
    .slice()
    .sort((left, right) => (right.end_time ?? 0) - (left.end_time ?? 0))
    .map((game) => mapGame(username, game))
    .filter((game): game is ImportedChessComGame => Boolean(game))
    .slice(0, limit);

  if (games.length === 0) {
    throw new ChessComImportError(
      "no_games",
      404,
      `No public games found for "${username}" in the last ${archiveMonths} archive months.`,
    );
  }

  return {
    username,
    archive: getArchiveWindow(archiveUrls),
    archives: archiveUrls.map((archiveUrl) => getArchiveLabel(archiveUrl)),
    games,
  };
}
