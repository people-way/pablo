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
const REPERTOIRE_CACHE_SECONDS = 6 * 60 * 60;
const archiveMemory = new Map<string, { expires: number; value: unknown }>();
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
  accuracies?: { white?: number; black?: number };
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
  /** Chess.com game accuracy for the imported player, when the archive includes it. */
  accuracy: number | null;
  playerRating: number | null;
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

async function fetchChessComJson<T>(
  url: string,
  fallbackMessage: string,
  revalidateSeconds = 0,
): Promise<T> {
  if (revalidateSeconds > 0) {
    const cached = archiveMemory.get(url);
    if (cached && cached.expires > Date.now()) {
      return cached.value as T;
    }
  }

  let response: Response;

  try {
    response = await fetch(
      url,
      revalidateSeconds > 0
        ? {
            headers: {
              Accept: "application/json",
              "User-Agent": CHESS_COM_USER_AGENT,
            },
            next: { revalidate: revalidateSeconds },
          }
        : {
            cache: "no-store",
            headers: {
              Accept: "application/json",
              "User-Agent": CHESS_COM_USER_AGENT,
            },
          },
    );
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

  if (revalidateSeconds > 0) {
    archiveMemory.set(url, {
      expires: Date.now() + revalidateSeconds * 1000,
      value: payload,
    });
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
    accuracy: playerAccuracy(game.accuracies, color),
    playerRating: player?.rating ?? null,
  };
}

function playerAccuracy(
  accuracies: { white?: number; black?: number } | undefined,
  color: "white" | "black",
): number | null {
  const value = accuracies?.[color];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return Math.round(Math.min(100, Math.max(0, value)) * 10) / 10;
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

export type ChessComRepertoireImport = {
  username: string;
  archives: string[];
  games: ImportedChessComGame[];
  skippedBullet: number;
  skippedVariant: number;
  capped: boolean;
};

/**
 * Recent standard games for the opening coach.
 * Bullets are left out. Archives are cached for six hours.
 */
export async function importChessComRepertoireGames(
  rawUsername: string,
  options?: {
    archiveMonths?: number;
    limit?: number;
  },
): Promise<ChessComRepertoireImport> {
  const username = normalizeUsername(rawUsername);
  const archiveMonths = Math.min(12, Math.max(1, options?.archiveMonths ?? 9));
  const limit = options?.limit ?? 500;

  if (!username) {
    throw new ChessComImportError("missing_username", 400, "Indique un pseudo Chess.com.");
  }

  const archivesResponse = await fetchChessComJson<ChessComArchivesResponse>(
    buildPlayerUrl(username, "/games/archives"),
    "Impossible de lire les archives Chess.com.",
    REPERTOIRE_CACHE_SECONDS,
  );

  const archiveUrls = getRecentArchiveUrls(archivesResponse.archives, archiveMonths);

  if (archiveUrls.length === 0) {
    throw new ChessComImportError(
      "no_games",
      404,
      `Aucune partie publique pour « ${username} ».`,
    );
  }

  const gamesResponses = await mapPool(archiveUrls, 3, (archiveUrl) =>
    fetchChessComJson<ChessComGamesResponse>(
      archiveUrl,
      "Impossible de lire une archive Chess.com.",
      REPERTOIRE_CACHE_SECONDS,
    ),
  );

  const sorted = gamesResponses
    .flatMap((gamesResponse) => gamesResponse.games ?? [])
    .slice()
    .sort((left, right) => (right.end_time ?? 0) - (left.end_time ?? 0));

  let skippedBullet = 0;
  let skippedVariant = 0;
  const kept: ChessComGame[] = [];

  for (const game of sorted) {
    if (game.rules && game.rules !== "chess") {
      skippedVariant += 1;
      continue;
    }
    if (game.time_class === "bullet") {
      skippedBullet += 1;
      continue;
    }
    kept.push(game);
  }

  const games = kept
    .map((game) => mapGame(username, game))
    .filter((game): game is ImportedChessComGame => Boolean(game))
    .slice(0, limit);
  const capped = kept.length > games.length;

  if (games.length === 0) {
    throw new ChessComImportError(
      "no_games",
      404,
      `Aucune partie de blitz, de rapide ou de longue durée pour « ${username} » sur cette période.`,
    );
  }

  return {
    username,
    archives: archiveUrls.map((archiveUrl) => getArchiveLabel(archiveUrl)),
    games,
    skippedBullet,
    skippedVariant,
    capped,
  };
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fn(items[index]);
    }
  }

  const workers = Math.min(Math.max(limit, 1), items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}
