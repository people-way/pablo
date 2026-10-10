import { Chess, type Square } from "chess.js";
import catalogJson from "../openings/catalog.json" with { type: "json" };
import { classLabel } from "./classify";
import { explainMove, type GamePhase } from "./explain";
import { isEndgame, loadChess, type Motif } from "./motifs";
import type { MoveAnalysis, MoveClass, ParsedMove, Side } from "./types";

type CatalogOpening = {
  opening_id: string;
  name: string;
  common_name?: string;
  move_order: string;
  variations?: Array<{ name: string; moves: string }>;
};

type BookLine = {
  id: string;
  french: string;
  variation: string | null;
  sans: string[];
  parentPlies: number;
};

export type OpeningReport = {
  name: string;
  variation: string | null;
  source: "catalog" | "header" | "unknown";
  bookPlies: number;
  exitPly: number | null;
  exitLabel: string | null;
};

export type Lesson = {
  title: string;
  text: string;
};

export type KeyMoment = {
  ply: number;
  label: string;
  classification: MoveClass;
  text: string;
};

export type CoachingSession = {
  opening: OpeningReport;
  phases: GamePhase[];
  notes: Array<{ text: string; motifs: Motif[] } | null>;
  lessons: Lesson[];
  keyMoments: KeyMoment[];
  partial: boolean;
  analyzed: number;
  focus: Side;
};

const FRENCH_OPENING: Record<string, string> = {
  italian_game: "Partie italienne",
  ruy_lopez: "Partie espagnole",
  kings_gambit: "Gambit du roi",
  vienna_game: "Partie viennoise",
  sicilian_najdorf: "Sicilienne Najdorf",
  sicilian_dragon: "Sicilienne Dragon",
  sicilian_scheveningen: "Sicilienne Scheveningen",
  sicilian_kan: "Sicilienne Kan",
  french_defense: "Défense française",
  caro_kann: "Défense Caro-Kann",
  kings_indian_defense: "Est-indienne",
  nimzo_indian: "Nimzo-indienne",
  queens_gambit_declined: "Gambit dame refusé",
  queens_gambit_accepted: "Gambit dame accepté",
  london_system: "Système de Londres",
  grunfeld_defense: "Défense Grünfeld",
  benoni_defense: "Benoni",
  dutch_defense: "Défense hollandaise",
  english_opening: "Partie anglaise",
  reti_opening: "Ouverture Réti",
  queens_indian: "Ouest-indienne",
  scandinavian_defense: "Défense scandinave",
  alekhine_defense: "Défense Alekhine",
  pirc_defense: "Défense Pirc",
  budapest_gambit: "Gambit de Budapest",
  four_knights_game: "Partie des quatre cavaliers",
  birds_opening: "Ouverture Bird",
  larsen_opening: "Ouverture Larsen",
  tarrasch_defense: "Défense Tarrasch",
};

const MOTIF_LABEL: Record<Motif, string> = {
  mat: "des mats ratés ou autorisés",
  fourchette: "des fourchettes manquées",
  clouage: "des clouages ignorés",
  enfilade: "des enfilades manquées",
  "echec-decouvert": "des échecs découverts manqués",
  "echec-double": "des échecs doubles manqués",
  "piece-en-prise": "des pièces laissées en prise",
  "coup-intermediaire": "des coups intermédiaires manqués",
  promotion: "des promotions manquées",
  finale: "des erreurs de finale",
  materiel: "des gains matériels manqués",
};

const MOTIF_RANK: Motif[] = [
  "mat",
  "fourchette",
  "clouage",
  "enfilade",
  "echec-double",
  "echec-decouvert",
  "coup-intermediaire",
  "piece-en-prise",
  "promotion",
  "finale",
  "materiel",
];

const PHASE_NAME: Record<GamePhase, string> = {
  ouverture: "ouverture",
  milieu: "milieu de partie",
  finale: "finale",
};

const MINOR_STARTS: Record<Side, Square[]> = {
  w: ["b1", "g1", "c1", "f1"],
  b: ["b8", "g8", "c8", "f8"],
};

const LINES = bookLines(catalogJson as CatalogOpening[]);

export function buildCoachingSession(input: {
  moves: ParsedMove[];
  analyses: Array<MoveAnalysis | null>;
  openingHeader?: string;
  result?: string;
  viewer?: Side | null;
}): CoachingSession {
  const opening = recognizeOpening(input.moves, input.openingHeader ?? "");
  const phases = input.moves.map((_, index) => phaseAt(input.moves, index + 1, opening.exitPly));
  phases.unshift(phaseAt(input.moves, 0, opening.exitPly));

  const notes = input.moves.map((move, index) => {
    const analysis = input.analyses[index];
    if (!analysis || !isWeak(analysis.classification)) {
      return null;
    }
    return explainMove({
      fenBefore: move.fenBefore,
      playedSan: move.san,
      playedUci: move.uci,
      bestUci: analysis.bestUci,
      bestSan: analysis.bestSan,
      pvUci: analysis.pvUci ?? [],
      pvSan: analysis.pvSan,
      before: analysis.before,
      after: analysis.after,
      color: move.color,
      phase: phases[index] ?? "ouverture",
    });
  });

  const analyzed = input.analyses.filter((item) => item != null).length;
  const focus = focusSide(input.moves, input.analyses, input.viewer ?? null, input.result ?? "*");
  const lessons =
    analyzed > 0
      ? buildLessons({ moves: input.moves, analyses: input.analyses, phases, notes, focus, viewer: input.viewer ?? null })
      : [];

  return {
    opening,
    phases,
    notes,
    lessons,
    keyMoments: keyMoments(input.moves, input.analyses, notes),
    partial: analyzed > 0 && analyzed < input.moves.length,
    analyzed,
    focus,
  };
}

export function recognizeOpening(moves: ParsedMove[], header: string): OpeningReport {
  const sans = moves.map((move) => move.san);
  const matched = matchBook(sans);
  const bookPlies = matched?.plies ?? 0;
  const exitPly = openingExit(moves, bookPlies);
  const exitLabel = exitPly ? plyLabel(moves[exitPly - 1]) : null;

  if (matched && matched.plies >= matched.floor) {
    return {
      name: matched.french,
      variation: matched.variation,
      source: "catalog",
      bookPlies,
      exitPly,
      exitLabel,
    };
  }

  const fromHeader = headerName(header.trim());
  if (fromHeader) {
    return {
      name: fromHeader.name,
      variation: fromHeader.variation,
      source: "header",
      bookPlies,
      exitPly,
      exitLabel,
    };
  }

  return {
    name: "Ouverture non identifiée",
    variation: null,
    source: "unknown",
    bookPlies,
    exitPly,
    exitLabel,
  };
}

export function phaseAt(moves: ParsedMove[], ply: number, exitPly: number | null): GamePhase {
  const fen = fenAt(moves, ply);
  if (isEndgame(fen)) {
    return "finale";
  }
  if (exitPly == null || ply < exitPly) {
    return "ouverture";
  }
  return "milieu";
}

export function describePhase(opening: OpeningReport, phase: GamePhase) {
  const where = phase === "ouverture" ? "Ouverture" : phase === "milieu" ? "Milieu de partie" : "Finale";
  const title = opening.variation ? `${opening.name} · ${opening.variation}` : opening.name;

  if (!opening.exitLabel) {
    return `${where} · ${title}. Pas encore de sortie d'ouverture.`;
  }

  if (phase === "ouverture") {
    return `${where} · ${title}. Sortie de l'ouverture au coup ${opening.exitLabel}.`;
  }

  return `${where} · ${title}. Sortie de l'ouverture : ${opening.exitLabel}.`;
}

export function plyLabel(move: ParsedMove | undefined) {
  if (!move) {
    return "";
  }
  return move.color === "w" ? `${move.moveNumber}. ${move.san}` : `${move.moveNumber}... ${move.san}`;
}

function matchBook(sans: string[]): { french: string; variation: string | null; plies: number; floor: number } | null {
  const groups = new Map<string, { french: string; parent: BookLine | null; variations: BookLine[] }>();

  for (const line of LINES) {
    const group = groups.get(line.id) ?? { french: line.french, parent: null, variations: [] };
    if (line.variation == null) {
      group.parent = line;
    } else {
      group.variations.push(line);
    }
    groups.set(line.id, group);
  }

  let best: { french: string; variation: string | null; plies: number; floor: number } | null = null;

  const consider = (candidate: { french: string; variation: string | null; plies: number; floor: number }) => {
    if (!best || candidate.plies > best.plies) {
      best = candidate;
      return;
    }

    if (
      candidate.plies === best.plies &&
      candidate.variation &&
      best.variation &&
      candidate.variation !== best.variation
    ) {
      best = { ...best, variation: null };
    }
  };

  for (const group of groups.values()) {
    if (!group.parent) {
      continue;
    }

    const parentPlies = commonPrefix(sans, group.parent.sans);

    if (parentPlies >= group.parent.sans.length) {
      let plies = group.parent.sans.length;
      let variation: string | null = null;
      const extended = group.variations
        .map((line) => ({ line, plies: commonPrefix(sans, line.sans) }))
        .filter((item) => item.plies > group.parent!.sans.length);

      if (extended.length > 0) {
        const max = Math.max(...extended.map((item) => item.plies));
        const leaders = extended.filter((item) => item.plies === max);
        plies = max;
        variation = leaders.length === 1 ? leaders[0].line.variation : null;
      }

      consider({ french: group.french, variation, plies, floor: group.parent.sans.length });
    }

    for (const line of group.variations) {
      if (startsWith(line.sans, group.parent.sans)) {
        continue;
      }

      const plies = commonPrefix(sans, line.sans);
      if (plies >= 4) {
        consider({ french: group.french, variation: line.variation, plies, floor: 4 });
      }
    }
  }

  return best;
}

function startsWith(line: string[], prefix: string[]) {
  return prefix.length <= line.length && commonPrefix(line, prefix) === prefix.length;
}

function openingExit(moves: ParsedMove[], bookPlies: number) {
  const leftBook = bookPlies > 0 && bookPlies < moves.length ? bookPlies + 1 : null;
  let development: number | null = null;

  if (!(bookPlies > 0 && bookPlies >= moves.length)) {
    for (let ply = bookPlies + 1; ply <= moves.length; ply += 1) {
      const chess = loadChess(fenAt(moves, ply));
      if (chess && leavesOpening(chess, ply)) {
        development = ply;
        break;
      }
    }
  }

  if (leftBook == null) return development;
  if (development == null) return leftBook;
  return Math.min(leftBook, development);
}

function leavesOpening(chess: Chess, ply: number) {
  if (ply < 8) {
    return false;
  }

  const minors =
    developedMinors(chess, "w") + developedMinors(chess, "b");
  const castled = castledKing(chess, "w") && castledKing(chess, "b");

  if (castled && minors >= 4) return true;
  if (ply >= 10 && minors >= 5) return true;
  if (ply >= 10 && minors >= 2 && centralPawns(chess) <= 1) return true;
  if (ply >= 16 && minors >= 4) return true;
  return false;
}

function developedMinors(chess: Chess, color: Side) {
  return MINOR_STARTS[color].filter((square) => {
    const piece = chess.get(square);
    if (!piece || piece.color !== color) {
      return true;
    }
    const knight = square.startsWith("b") || square.startsWith("g");
    return piece.type !== (knight ? "n" : "b");
  }).length;
}

function castledKing(chess: Chess, color: Side) {
  const expected = color === "w" ? ["g1", "c1"] : ["g8", "c8"];
  return expected.some((square) => {
    const piece = chess.get(square as Square);
    return piece?.type === "k" && piece.color === color;
  });
}

function centralPawns(chess: Chess) {
  return (["d4", "d5", "e4", "e5"] as Square[]).filter((square) => chess.get(square)?.type === "p").length;
}

function fenAt(moves: ParsedMove[], ply: number) {
  if (ply <= 0) {
    return moves[0]?.fenBefore ?? new Chess().fen();
  }
  return moves[ply - 1]?.fenAfter ?? moves[0]?.fenBefore ?? new Chess().fen();
}

function buildLessons(input: {
  moves: ParsedMove[];
  analyses: Array<MoveAnalysis | null>;
  phases: GamePhase[];
  notes: Array<{ text: string; motifs: Motif[] } | null>;
  focus: Side;
  viewer: Side | null;
}): Lesson[] {
  const you = input.viewer === input.focus;
  const subject = you ? "Tu" : input.focus === "w" ? "Les Blancs" : "Les Noirs";
  const verb = you ? "tu lâches" : input.focus === "w" ? "les Blancs lâchent" : "les Noirs lâchent";
  const rows = input.moves.map((move, index) => ({
    move,
    analysis: input.analyses[index],
    phase: input.phases[index] ?? "ouverture",
    note: input.notes[index],
  }));
  const own = rows.filter((row) => row.move.color === input.focus && row.analysis);
  const worst = [...own].sort((left, right) => (right.analysis?.cpLoss ?? 0) - (left.analysis?.cpLoss ?? 0))[0];
  const gameWorst = [...rows].filter((row) => row.analysis).sort((left, right) => (right.analysis?.cpLoss ?? 0) - (left.analysis?.cpLoss ?? 0))[0];
  const moment = worst && (worst.analysis?.cpLoss ?? 0) > 0 ? worst : gameWorst;

  const critical = moment?.analysis
    ? `${plyLabel(moment.move)} est le coup qui coûte le plus (${signedPawns(moment.analysis.cpLoss)}). ${firstSentence(moment.note?.text) || classLabel(moment.analysis.classification) + "."}`
    : "Aucun écart d'évaluation sur les coups analysés.";

  const byPhase: Record<GamePhase, number> = { ouverture: 0, milieu: 0, finale: 0 };
  for (const row of own) {
    byPhase[row.phase] += row.analysis?.cpLoss ?? 0;
  }
  const ranked = (Object.keys(byPhase) as GamePhase[]).sort((left, right) => byPhase[right] - byPhase[left]);
  const top = ranked[0];
  const phaseText =
    byPhase[top] <= 0
      ? `${subject} ne lâche pas d'évaluation sur les coups analysés.`
      : `C'est en ${PHASE_NAME[top]} que ${verb} le plus : ${pawns(byPhase[top])}, contre ${pawns(byPhase[ranked[1]])} en ${PHASE_NAME[ranked[1]]} et ${pawns(byPhase[ranked[2]])} en ${PHASE_NAME[ranked[2]]}.`;

  const counts = new Map<Motif, { count: number; labels: string[] }>();
  for (const row of own) {
    if (!row.note || !isWeak(row.analysis?.classification ?? "ok")) {
      continue;
    }
    for (const motif of row.note.motifs) {
      const entry = counts.get(motif) ?? { count: 0, labels: [] };
      entry.count += 1;
      entry.labels.push(plyLabel(row.move));
      counts.set(motif, entry);
    }
  }

  let motifText = `${subject === "Tu" ? "Tu n'as" : `${subject} n'ont`} pas de motif répété sur les coups faibles.`;
  if (subject === "Les Blancs" || subject === "Les Noirs") {
    motifText = `${subject} n'ont pas de motif répété sur les coups faibles.`;
  } else {
    motifText = "Tu n'as pas de motif répété sur les coups faibles.";
  }

  const repeated = [...counts.entries()].filter((entry) => entry[1].count >= 2);
  if (repeated.length > 0) {
    repeated.sort((left, right) => right[1].count - left[1].count || MOTIF_RANK.indexOf(left[0]) - MOTIF_RANK.indexOf(right[0]));
    const [motif, entry] = repeated[0];
    motifText = `Le motif qui revient : ${MOTIF_LABEL[motif]}, ${entry.count} fois (${entry.labels.slice(0, 3).join(", ")}).`;
  } else if (counts.size > 0) {
    const listed = [...counts.keys()]
      .sort((left, right) => MOTIF_RANK.indexOf(left) - MOTIF_RANK.indexOf(right))
      .slice(0, 3)
      .map((motif) => MOTIF_LABEL[motif]);
    motifText = `Pas de motif répété. Les erreurs isolées : ${listed.join(", ")}.`;
  }

  return [
    { title: "Moment critique", text: critical },
    { title: "Où la partie se perd", text: phaseText },
    { title: "Type d'erreur", text: motifText },
  ];
}

function keyMoments(
  moves: ParsedMove[],
  analyses: Array<MoveAnalysis | null>,
  notes: Array<{ text: string; motifs: Motif[] } | null>,
): KeyMoment[] {
  return moves
    .map((move, index) => ({ move, analysis: analyses[index], note: notes[index] }))
    .filter((row): row is { move: ParsedMove; analysis: MoveAnalysis; note: (typeof notes)[number] } => row.analysis != null)
    .sort((left, right) => right.analysis.cpLoss - left.analysis.cpLoss || left.move.ply - right.move.ply)
    .slice(0, 3)
    .map((row) => ({
      ply: row.move.ply,
      label: plyLabel(row.move),
      classification: row.analysis.classification,
      text: firstSentence(row.note?.text) || classLabel(row.analysis.classification),
    }));
}

function focusSide(
  moves: ParsedMove[],
  analyses: Array<MoveAnalysis | null>,
  viewer: Side | null,
  result: string,
): Side {
  if (viewer) {
    return viewer;
  }

  const loss = { w: 0, b: 0 };
  moves.forEach((move, index) => {
    loss[move.color] += analyses[index]?.cpLoss ?? 0;
  });

  if (loss.w !== loss.b) {
    return loss.w > loss.b ? "w" : "b";
  }

  if (result === "1-0") return "b";
  if (result === "0-1") return "w";
  return "w";
}

function isWeak(classification: MoveClass) {
  return classification === "inaccuracy" || classification === "mistake" || classification === "blunder";
}

function firstSentence(text: string | undefined) {
  if (!text) {
    return "";
  }
  const match = text.match(/^.*?[.!?](?:\s|$)/);
  return match ? match[0].trim() : text;
}

function pawns(cp: number) {
  const value = cp / 100;
  const label = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
  return `${label} ${Math.abs(value - 1) < 0.001 ? "pion" : "pions"}`;
}

function signedPawns(cp: number) {
  return `-${pawns(cp)}`;
}

function headerName(header: string): { name: string; variation: string | null } | null {
  if (!header) {
    return null;
  }

  const normalized = normalize(header);
  let best: { name: string; variation: string | null; score: number } | null = null;

  for (const opening of catalogJson as CatalogOpening[]) {
    const french = FRENCH_OPENING[opening.opening_id] ?? opening.name;
    for (const candidate of [opening.name, opening.common_name ?? ""]) {
      const needle = normalize(candidate);
      if (needle.length >= 4 && normalized.includes(needle) && (!best || needle.length > best.score)) {
        best = { name: french, variation: null, score: needle.length };
      }
    }

    for (const variation of opening.variations ?? []) {
      const needle = normalize(variation.name);
      if (needle.length >= 8 && normalized.includes(needle) && (!best || needle.length > best.score)) {
        best = { name: french, variation: variation.name, score: needle.length };
      }
    }
  }

  if (best) {
    return { name: best.name, variation: best.variation };
  }

  return { name: header, variation: null };
}

function bookLines(catalog: CatalogOpening[]): BookLine[] {
  const lines: BookLine[] = [];

  for (const opening of catalog) {
    const base = legalSans(opening.move_order);
    if (!base) {
      continue;
    }
    const french = FRENCH_OPENING[opening.opening_id] ?? opening.name;
    lines.push({
      id: opening.opening_id,
      french,
      variation: null,
      sans: base,
      parentPlies: base.length,
    });

    for (const variation of opening.variations ?? []) {
      const sans = legalSans(variation.moves);
      if (!sans) {
        continue;
      }
      lines.push({
        id: opening.opening_id,
        french,
        variation: variation.name,
        sans,
        parentPlies: base.length,
      });
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
    .map((token) => token.trim())
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

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
