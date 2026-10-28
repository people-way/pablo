import { Chess } from "chess.js";
import catalogJson from "@/lib/openings/catalog.json";
import { formatPeriod, formatSans } from "@/lib/openings/line-format";
import { coachSummary, coachWeakness } from "@/lib/openings/advice";
import { openingLabel } from "@/lib/review/parse";
import { recognizeOpening } from "@/lib/review/session";
import type { ParsedMove, Side } from "@/lib/review/types";
import type {
  ColorName,
  ColorRepertoire,
  LineStats,
  OpeningAnchor,
  OpeningFamily,
  OpeningWeakness,
  RepertoireReport,
  TreeNode,
  WeaknessKind,
} from "@/lib/openings/repertoire-types";

const MAX_PLIES = 16;
const MIN_PLIES = 6;
const MAX_CHILDREN = 8;
const MAX_WEAKNESSES = 5;
const UNKNOWN = "Ouverture non identifiée";

type CatalogOpening = {
  opening_id: string;
  move_order: string;
  variations?: Array<{ moves: string }>;
};

type BookLine = {
  id: string;
  sans: string[];
};

export type RepertoireGame = {
  pgn: string;
  color: ColorName;
  result: "win" | "loss" | "draw";
  date: string | null;
  accuracy: number | null;
  timeClass: string | null;
  rules: string | null;
  url: string | null;
  playerRating: number | null;
};

type MutableStats = {
  games: number;
  wins: number;
  draws: number;
  losses: number;
  accuracySum: number;
  accuracyCount: number;
  bookMoves: number;
  userExits: number;
  opponentExits: number;
};

type MutableNode = MutableStats & {
  san: string | null;
  ply: number;
  fen: string;
  byUser: boolean;
  path: string[];
  parent: MutableNode | null;
  children: Map<string, MutableNode>;
  sampleUrl: string | null;
  sampleDate: string | null;
};

type Candidate = {
  node: MutableNode;
  weight: number;
  early: boolean;
};

const BOOK: BookLine[] = bookLines(catalogJson as CatalogOpening[]);

export function buildRepertoire(
  games: RepertoireGame[],
  options?: {
    username?: string;
    months?: number;
    archives?: string[];
    skippedBullet?: number;
    skippedVariant?: number;
    capped?: boolean;
  },
): RepertoireReport {
  const username = options?.username?.trim() || "toi";
  const months = options?.months ?? 9;
  const archives = options?.archives ?? [];
  const roots: Record<ColorName, MutableNode> = {
    white: makeNode(null, 0, new Chess().fen(), false, []),
    black: makeNode(null, 0, new Chess().fen(), false, []),
  };
  const families = new Map<string, OpeningFamily>();

  const fetchedGames = games.length;
  let gameCount = 0;
  let skippedShort = 0;
  let skippedBullet = options?.skippedBullet ?? 0;
  let skippedVariant = options?.skippedVariant ?? 0;
  let skippedUnread = 0;
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let ratingSum = 0;
  let ratingCount = 0;
  let latestRating: { date: string; rating: number } | null = null;
  const dates: string[] = [];

  for (const game of games) {
    if (game.rules && game.rules !== "chess") {
      skippedVariant += 1;
      continue;
    }
    if (game.timeClass === "bullet") {
      skippedBullet += 1;
      continue;
    }

    const parsed = playPgn(game.pgn);
    if (!parsed) {
      skippedUnread += 1;
      continue;
    }
    if (parsed.moves.length < MIN_PLIES) {
      skippedShort += 1;
      continue;
    }

    const user: Side = game.color === "white" ? "w" : "b";
    const treeSans = parsed.moves.slice(0, MAX_PLIES).map((move) => move.san);
    const covered = bookPrefixLength(parsed.moves.slice(0, 24).map((move) => move.san));
    const root = roots[game.color];
    addResult(root, game);

    let cursor = root;
    for (let index = 0; index < treeSans.length; index += 1) {
      const san = treeSans[index];
      const ply = index + 1;
      let child = cursor.children.get(san);
      if (!child) {
        child = makeNode(san, ply, parsed.moves[index].fenAfter, parsed.moves[index].color === user, cursor.path.concat(san));
        child.parent = cursor;
        cursor.children.set(san, child);
      }
      addResult(child, game);
      if (ply <= covered) {
        child.bookMoves += 1;
      }
      if (covered === index && index >= 3) {
        if (parsed.moves[index].color === user) {
          child.userExits += 1;
        } else {
          child.opponentExits += 1;
        }
      }
      rememberSample(child, game);
      cursor = child;
    }

    const named = namePath(parsed.moves.map((move) => move.san), parsed.header);
    const familyName = familyTitle(named.name, named.variation);
    const familyKey = `${familyName}::${game.color}`;
    const family = families.get(familyKey) ?? {
      opening: familyName,
      color: game.color,
      gameCount: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      winRate: 0,
      scorePct: 0,
    };
    family.gameCount += 1;
    if (game.result === "win") family.wins += 1;
    else if (game.result === "draw") family.draws += 1;
    else family.losses += 1;
    family.winRate = winRate(family.wins, family.gameCount);
    family.scorePct = scorePct(family.wins, family.draws, family.gameCount);
    families.set(familyKey, family);

    gameCount += 1;
    if (game.result === "win") wins += 1;
    else if (game.result === "draw") draws += 1;
    else losses += 1;
    if (game.date) dates.push(game.date);
    if (game.playerRating != null) {
      ratingSum += game.playerRating;
      ratingCount += 1;
      if (!latestRating || (game.date ?? "") >= latestRating.date) {
        latestRating = { date: game.date ?? "", rating: game.playerRating };
      }
    }
  }

  const familyList = [...families.values()]
    .filter((family) => family.gameCount >= 2)
    .sort((left, right) => right.gameCount - left.gameCount || left.opening.localeCompare(right.opening, "fr"))
    .slice(0, 30);

  const anchors = pickAnchors(familyList);
  const weaknesses = pickWeaknesses(roots);
  const periodLabel = formatPeriod(archives);
  const summary = coachSummary({
    username,
    gameCount,
    scorePct: scorePct(wins, draws, gameCount),
    periodLabel,
    weaknesses,
    anchors,
  });

  dates.sort();

  return {
    username,
    months,
    archives,
    periodLabel,
    fetchedAt: new Date().toISOString(),
    fetchedGames,
    gameCount,
    skippedShort,
    skippedBullet,
    skippedVariant,
    skippedUnread,
    capped: Boolean(options?.capped),
    wins,
    losses,
    draws,
    winRate: winRate(wins, gameCount),
    scorePct: scorePct(wins, draws, gameCount),
    dateRange: dates.length > 0 ? { from: dates[0], to: dates[dates.length - 1] } : null,
    rating: {
      latest: latestRating?.rating ?? null,
      average: ratingCount > 0 ? Math.round(ratingSum / ratingCount) : null,
    },
    summary,
    colors: {
      white: publishColor(roots.white, "white"),
      black: publishColor(roots.black, "black"),
    },
    weaknesses,
    anchors,
    families: familyList,
  };
}

function publishColor(root: MutableNode, color: ColorName): ColorRepertoire {
  return {
    stats: toStats(root),
    tree: publishNode(root, color, root.games >= 8 ? 2 : 1),
  };
}

function publishNode(node: MutableNode, color: ColorName, minGames: number): TreeNode {
  const children = [...node.children.values()].sort(compareNodes);
  const eligible = children.filter((child) => child.games >= minGames);
  const visible = (eligible.length > 0 ? eligible : children).slice(0, MAX_CHILDREN);
  const shown = visible.reduce((sum, child) => sum + child.games, 0);
  const childGames = children.reduce((sum, child) => sum + child.games, 0);
  const named = node.path.length > 0 ? namePath(node.path, "") : { name: UNKNOWN, variation: null };

  return {
    id: nodeId(color, node.path),
    san: node.san,
    ply: node.ply,
    byUser: node.byUser,
    fen: node.fen,
    openingName: named.name,
    variation: named.variation,
    inBookShare: node.games > 0 ? node.bookMoves / node.games : 0,
    userExits: node.userExits,
    opponentExits: node.opponentExits,
    rareGames: Math.max(0, childGames - shown),
    stats: toStats(node),
    children: visible.map((child) => publishNode(child, color, child.games >= 8 ? 2 : 1)),
  };
}

function pickWeaknesses(roots: Record<ColorName, MutableNode>): OpeningWeakness[] {
  const candidates: Array<Candidate & { color: ColorName }> = [];

  for (const color of ["white", "black"] as const) {
    walk(roots[color], (node) => {
      if (!node.san || node.ply < 4) {
        return;
      }
      const impact = (node.games * Math.max(0, 50 - nodeScore(node))) / 100;
      const early = node.games === 2 && nodeScore(node) <= 25;
      const severe = node.games >= 3 && nodeScore(node) <= 25 && impact >= 1;
      const main =
        node.games >= 4 &&
        nodeScore(node) < 48 &&
        impact >= 1 &&
        (node.userExits >= 2 || node.opponentExits >= 2 || node.ply >= 6 || node.games >= 6);
      if (!main && !severe && !early) {
        return;
      }
      candidates.push({ node, color, weight: weightOf(node), early: early && !main && !severe });
    });
  }

  const mains = candidates.filter((candidate) => !candidate.early).sort((left, right) => right.weight - left.weight);
  const selected: Array<Candidate & { color: ColorName }> = [];

  for (const candidate of mains) {
    const key = pathKey(candidate.color, candidate.node.path);
    if (selected.some((item) => related(pathKey(item.color, item.node.path), key))) {
      continue;
    }
    selected.push(candidate);
    if (selected.length === MAX_WEAKNESSES) {
      break;
    }
  }

  if (selected.length < 2) {
    const signals = candidates
      .filter((candidate) => candidate.early)
      .sort((left, right) => right.weight - left.weight);
    for (const candidate of signals) {
      const key = pathKey(candidate.color, candidate.node.path);
      if (selected.some((item) => related(pathKey(item.color, item.node.path), key))) {
        continue;
      }
      selected.push(candidate);
      if (selected.length === MAX_WEAKNESSES) {
        break;
      }
    }
  }

  const colors = new Set(selected.map((item) => item.color));
  if (colors.size === 1 && selected.length < MAX_WEAKNESSES) {
    const missing = colors.has("white") ? "black" : "white";
    const extra = mains.find(
      (candidate) =>
        candidate.color === missing &&
        !selected.some((item) => related(pathKey(item.color, item.node.path), pathKey(candidate.color, candidate.node.path))),
    );
    if (extra) {
      selected.push(extra);
    }
  }

  return selected.slice(0, MAX_WEAKNESSES).map((candidate) => toWeakness(candidate.color, candidate.node, candidate.early));
}

function toWeakness(color: ColorName, node: MutableNode, early: boolean): OpeningWeakness {
  const named = namePath(node.path, "");
  const openingId = named.name === UNKNOWN ? null : openingIdFor(node.path);
  const parentPath = node.path.slice(0, -1);
  const parentFen = fenAfter(parentPath) ?? new Chess().fen();
  const insteadRaw = node.byUser ? bookNext(parentPath, node.san) : bookNext(node.path, null);
  const insteadFen = node.byUser ? parentFen : node.fen;
  const insteadSan = legalSan(insteadFen, insteadRaw);
  const betterTry = node.byUser ? betterSibling(node) : null;
  const quizSan = insteadSan ?? (betterTry ? legalSan(parentFen, betterTry.san) : null);
  const kind = weaknessKind(node, early, insteadSan);
  const stats = toStats(node);
  const splits = [...node.children.values()]
    .filter((child) => child.games >= 2 && child.san)
    .sort(compareNodes)
    .slice(0, 3)
    .map((child) => ({ san: child.san ?? "", games: child.games, scorePct: nodeScore(child) }));
  const copy = coachWeakness({
    color,
    openingName: named.name === UNKNOWN ? formatSans(node.path) : named.name,
    variation: named.name === UNKNOWN ? null : named.variation,
    openingId,
    kind,
    sans: node.path,
    ply: node.ply,
    playedSan: node.san ?? "",
    playedByUser: node.byUser,
    insteadSan: quizSan,
    stats,
    userExits: node.userExits,
    betterTry: insteadSan ? null : betterTry,
    splits,
    contrast: contrastMove(node),
  });

  const setupSans = node.byUser || !quizSan ? parentPath : node.path;

  return {
    id: nodeId(color, node.path),
    color,
    kind,
    openingName: named.name === UNKNOWN ? formatSans(node.path) : named.name,
    variation: named.name === UNKNOWN ? null : named.variation,
    line: formatSans(node.path),
    sans: node.path,
    fen: node.fen,
    ply: node.ply,
    playedSan: node.san ?? "",
    playedByUser: node.byUser,
    insteadSan: quizSan,
    stats,
    userExits: node.userExits,
    diagnosis: copy.diagnosis,
    whatToPlay: copy.whatToPlay,
    idea: copy.idea,
    drill: {
      orientation: color === "white" ? "w" : "b",
      replaySans: node.path,
      setupSans,
      quizSan,
    },
    sampleUrl: node.sampleUrl,
  };
}

function weaknessKind(node: MutableNode, early: boolean, insteadSan: string | null): WeaknessKind {
  if (early) {
    return "early-signal";
  }
  if (node.byUser && node.userExits >= 2 && node.userExits / node.games >= 0.34 && insteadSan) {
    return "early-exit";
  }
  const inBook = node.games > 0 && node.bookMoves / node.games >= 0.5;
  if (!node.byUser && !inBook && node.games >= 3 && nodeScore(node) <= 45 && node.ply >= 4) {
    return "opponent-reply";
  }
  return "bad-result";
}

function contrastMove(node: MutableNode) {
  const parent = node.parent;
  const branch = parent?.parent;
  if (!parent?.san || !branch) {
    return null;
  }

  let best: { san: string; games: number; scorePct: number; insteadOf: string } | null = null;
  const parentScore = nodeScore(parent);

  for (const sibling of branch.children.values()) {
    if (sibling === parent || !sibling.san || sibling.games < 3) {
      continue;
    }
    const score = nodeScore(sibling);
    if (score < parentScore + 20) {
      continue;
    }
    if (!best || score > best.scorePct || (score === best.scorePct && sibling.games > best.games)) {
      best = { san: sibling.san, games: sibling.games, scorePct: score, insteadOf: parent.san };
    }
  }

  return best;
}

function betterSibling(node: MutableNode) {
  const parent = node.parent;
  if (!parent) {
    return null;
  }

  let best: { san: string; games: number; scorePct: number } | null = null;

  for (const child of parent.children.values()) {
    if (child === node || child.games < 2 || !child.san) {
      continue;
    }
    const score = nodeScore(child);
    if (score < nodeScore(node) + 15) {
      continue;
    }
    if (!best || score > best.scorePct || (score === best.scorePct && child.games > best.games)) {
      best = { san: child.san, games: child.games, scorePct: score };
    }
  }

  return best;
}

function nodeScore(node: MutableStats) {
  return scorePct(node.wins, node.draws, node.games);
}

function weightOf(node: MutableNode) {
  const deficit = Math.max(0, 50 - nodeScore(node));
  let weight = (node.games * deficit) / 100;
  if (node.userExits >= 2) {
    weight *= 1.45;
  }
  if (node.opponentExits >= 2) {
    weight *= 1.2;
  }
  weight *= 1 + Math.min(node.ply, 16) / 32;
  return weight;
}

function pickAnchors(families: OpeningFamily[]): OpeningAnchor[] {
  return families
    .filter((family) => family.gameCount >= 4 && family.scorePct >= 58)
    .sort((left, right) => right.scorePct - left.scorePct || right.gameCount - left.gameCount)
    .slice(0, 2)
    .map((family) => ({
      color: family.color,
      openingName: family.opening,
      stats: {
        games: family.gameCount,
        wins: family.wins,
        draws: family.draws,
        losses: family.losses,
        scorePct: family.scorePct,
        winRate: family.winRate,
        avgAccuracy: null,
        accuracyGames: 0,
      },
    }));
}

function makeNode(san: string | null, ply: number, fen: string, byUser: boolean, path: string[]): MutableNode {
  return {
    san,
    ply,
    fen,
    byUser,
    path,
    games: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    accuracySum: 0,
    accuracyCount: 0,
    bookMoves: 0,
    userExits: 0,
    opponentExits: 0,
    children: new Map(),
    sampleUrl: null,
    sampleDate: null,
    parent: null,
  };
}

function addResult(node: MutableNode, game: RepertoireGame) {
  node.games += 1;
  if (game.result === "win") node.wins += 1;
  else if (game.result === "draw") node.draws += 1;
  else node.losses += 1;
  if (game.accuracy != null) {
    node.accuracySum += game.accuracy;
    node.accuracyCount += 1;
  }
}

function rememberSample(node: MutableNode, game: RepertoireGame) {
  if (!game.url) {
    return;
  }
  if (!node.sampleDate || (game.date ?? "") >= node.sampleDate) {
    node.sampleDate = game.date;
    node.sampleUrl = game.url;
  }
}

function toStats(node: MutableStats): LineStats {
  return {
    games: node.games,
    wins: node.wins,
    draws: node.draws,
    losses: node.losses,
    scorePct: scorePct(node.wins, node.draws, node.games),
    winRate: winRate(node.wins, node.games),
    avgAccuracy: node.accuracyCount > 0 ? Math.round((node.accuracySum / node.accuracyCount) * 10) / 10 : null,
    accuracyGames: node.accuracyCount,
  };
}

function scorePct(wins: number, draws: number, games: number) {
  if (games <= 0) {
    return 0;
  }
  return Math.round(((wins + draws * 0.5) / games) * 100);
}

function winRate(wins: number, games: number) {
  if (games <= 0) {
    return 0;
  }
  return Math.round((wins / games) * 100);
}

function compareNodes(left: MutableNode, right: MutableNode) {
  return right.games - left.games || (left.san ?? "").localeCompare(right.san ?? "");
}

function walk(node: MutableNode, visit: (node: MutableNode) => void) {
  visit(node);
  for (const child of node.children.values()) {
    walk(child, visit);
  }
}

function nodeId(color: ColorName, path: string[]) {
  return `${color}:${path.join(" ")}`;
}

function pathKey(color: ColorName, path: string[]) {
  return nodeId(color, path);
}

function related(left: string, right: string) {
  return left === right || left.startsWith(`${right} `) || right.startsWith(`${left} `);
}

function familyTitle(name: string, variation: string | null) {
  if (name === UNKNOWN) {
    return "Lignes hors catalogue";
  }
  const title = variation ? `${name} · ${variation}` : name;
  return title.slice(0, 120);
}

type Played = {
  header: string;
  moves: ParsedMove[];
};

function playPgn(pgn: string): Played | null {
  const chess = new Chess();
  const text = pgn.replace(/\{[^}]*\}/g, " ").replace(/\([^)]*\)/g, " ");

  try {
    chess.loadPgn(text);
  } catch {
    return null;
  }

  const verbose = chess.history({ verbose: true });
  if (verbose.length === 0) {
    return null;
  }

  const headers = chess.getHeaders();
  const replay = new Chess();
  const moves: ParsedMove[] = [];

  for (let index = 0; index < verbose.length; index += 1) {
    const fenBefore = replay.fen();
    const played = replay.move(verbose[index].san);
    if (!played) {
      return null;
    }
    moves.push({
      ply: index + 1,
      moveNumber: Math.floor(index / 2) + 1,
      san: played.san,
      uci: `${played.from}${played.to}${played.promotion ?? ""}`,
      color: played.color,
      fenBefore,
      fenAfter: replay.fen(),
      comment: "",
    });
  }

  return {
    header: openingLabel(headers),
    moves,
  };
}

const nameCache = new Map<string, { name: string; variation: string | null }>();

function namePath(sans: string[], header: string) {
  const key = `${header}::${sans.join(" ")}`;
  const cached = nameCache.get(key);
  if (cached) {
    return cached;
  }
  const moves = toParsedMoves(sans);
  const named = moves ? recognizeOpening(moves, header) : { name: UNKNOWN, variation: null };
  const value = { name: named.name, variation: named.variation };
  nameCache.set(key, value);
  return value;
}

function toParsedMoves(sans: string[]): ParsedMove[] | null {
  const chess = new Chess();
  const moves: ParsedMove[] = [];

  for (let index = 0; index < sans.length; index += 1) {
    const fenBefore = chess.fen();
    let played;
    try {
      played = chess.move(sans[index]);
    } catch {
      return null;
    }
    if (!played) {
      return null;
    }
    moves.push({
      ply: index + 1,
      moveNumber: Math.floor(index / 2) + 1,
      san: played.san,
      uci: `${played.from}${played.to}${played.promotion ?? ""}`,
      color: played.color,
      fenBefore,
      fenAfter: chess.fen(),
      comment: "",
    });
  }

  return moves;
}

function openingIdFor(sans: string[]) {
  let bestId: string | null = null;
  let best = 0;
  let bestLength = Number.POSITIVE_INFINITY;

  for (const line of BOOK) {
    const plies = commonPrefix(sans, line.sans);
    if (plies > best || (plies === best && plies > 0 && line.sans.length < bestLength)) {
      best = plies;
      bestId = line.id;
      bestLength = line.sans.length;
    }
  }

  return best >= 4 ? bestId : null;
}

function bookPrefixLength(sans: string[]) {
  let best = 0;
  for (const line of BOOK) {
    const plies = commonPrefix(sans, line.sans);
    if (plies > best) {
      best = plies;
    }
  }
  return best;
}

function bookNext(parentSans: string[], avoid: string | null) {
  let best: { san: string; length: number } | null = null;

  for (const line of BOOK) {
    if (commonPrefix(line.sans, parentSans) !== parentSans.length) {
      continue;
    }
    if (line.sans.length <= parentSans.length) {
      continue;
    }
    const next = line.sans[parentSans.length];
    if (avoid && next === avoid) {
      continue;
    }
    if (!best || line.sans.length > best.length) {
      best = { san: next, length: line.sans.length };
    }
  }

  return best?.san ?? null;
}

function legalSan(fen: string, san: string | null) {
  if (!san) {
    return null;
  }
  const chess = new Chess(fen);
  try {
    const move = chess.move(san);
    return move?.san ?? null;
  } catch {
    return null;
  }
}

function fenAfter(sans: string[]) {
  const chess = new Chess();
  for (const san of sans) {
    try {
      if (!chess.move(san)) {
        return null;
      }
    } catch {
      return null;
    }
  }
  return chess.fen();
}

function bookLines(catalog: CatalogOpening[]): BookLine[] {
  const lines: BookLine[] = [];

  for (const opening of catalog) {
    const base = legalSans(opening.move_order);
    if (base) {
      lines.push({ id: opening.opening_id, sans: base });
    }
    for (const variation of opening.variations ?? []) {
      const sans = legalSans(variation.moves);
      if (sans) {
        lines.push({ id: opening.opening_id, sans });
      }
    }
  }

  return lines;
}

function legalSans(movetext: string) {
  const tokens = movetext
    .replace(/\{[^}]*\}/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\d+\.(?:\.\.)?/g, " ")
    .replace(/1-0|0-1|1\/2-1\/2|\*/g, " ")
    .split(/\s+/)
    .map((token) => token.replace(/[+#?!]/g, ""))
    .filter((token) => token && !/^\d+$/.test(token))
    .map((token) => token.replace(/^0-0-0/, "O-O-O").replace(/^0-0/, "O-O"));

  if (tokens.length === 0) {
    return null;
  }

  const chess = new Chess();
  const sans: string[] = [];

  for (const token of tokens) {
    try {
      const move = chess.move(token);
      if (!move) {
        return null;
      }
      sans.push(move.san);
    } catch {
      return null;
    }
  }

  return sans;
}

function commonPrefix(left: string[], right: string[]) {
  const length = Math.min(left.length, right.length);
  let index = 0;
  for (; index < length; index += 1) {
    if (left[index] !== right[index]) {
      break;
    }
  }
  return index;
}
