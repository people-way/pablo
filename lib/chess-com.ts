const CHESS_COM_BASE_URL = "https://api.chess.com/pub/player";
const CHESS_COM_USER_AGENT =
  "Pablo/1.0 (https://pablo.nanocorp.app; contact: support@pablo.nanocorp.app)";
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
};

export type ChessComImportResult = {
  username: string;
  archive: string;
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
  };
}

export async function importRecentChessComGames(
  rawUsername: string,
): Promise<ChessComImportResult> {
  const username = normalizeUsername(rawUsername);

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

  const archiveUrl = archivesResponse.archives?.at(-1);

  if (!archiveUrl) {
    throw new ChessComImportError(
      "no_games",
      404,
      `No public games found for "${username}".`,
    );
  }

  const gamesResponse = await fetchChessComJson<ChessComGamesResponse>(
    archiveUrl,
    "Unable to load the latest Chess.com games archive.",
  );

  const games = (gamesResponse.games ?? [])
    .slice()
    .sort((left, right) => (right.end_time ?? 0) - (left.end_time ?? 0))
    .map((game) => mapGame(username, game))
    .filter((game): game is ImportedChessComGame => Boolean(game))
    .slice(0, 10);

  if (games.length === 0) {
    throw new ChessComImportError(
      "no_games",
      404,
      `No public games found for "${username}" in the latest archive month.`,
    );
  }

  return {
    username,
    archive: getArchiveLabel(archiveUrl),
    games,
  };
}
