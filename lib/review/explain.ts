import type { PieceSymbol, Square } from "chess.js";
import type { NodeEval, Side } from "./types";
import { moverCentipawns } from "./scores";
import {
  type Motif,
  checkKind,
  findForcedMate,
  forkTargets,
  loadChess,
  mateLine,
  opponentQueenCaptured,
  opposite,
  pieceAttacks,
  pinsAgainst,
  playUci,
  profitableCaptures,
  skewer,
  stableMaterialGain,
} from "./motifs";

export type GamePhase = "ouverture" | "milieu" | "finale";

export type MoveExplanation = {
  text: string;
  motifs: Motif[];
};

export type ExplainInput = {
  fenBefore: string;
  playedSan: string;
  playedUci: string;
  bestUci: string | null;
  bestSan: string | null;
  pvUci: string[];
  pvSan: string;
  before: NodeEval;
  after: NodeEval;
  color: Side;
  phase: GamePhase;
};

const PIECE_FR: Record<PieceSymbol, { name: string; article: string }> = {
  p: { name: "pion", article: "le" },
  n: { name: "cavalier", article: "le" },
  b: { name: "fou", article: "le" },
  r: { name: "tour", article: "la" },
  q: { name: "dame", article: "la" },
  k: { name: "roi", article: "le" },
};

export function explainMove(input: ExplainInput): MoveExplanation {
  const before = loadChess(input.fenBefore);
  if (!before) {
    return { text: swing(input), motifs: [] };
  }

  const played = playUci(before, input.playedUci);
  const after = played ? loadChess(played.after) : null;
  before.undo();

  const bestBoard = loadChess(input.fenBefore);
  const best = input.bestUci && bestBoard ? playUci(bestBoard, input.bestUci) : null;
  const motifs: Motif[] = [];
  const sentences: string[] = [];

  const missed = missedMate(input);
  if (missed) {
    motifs.push("mat");
    sentences.push(missed);
    sentences.push(`${input.playedSan} laisse tomber cette suite. ${swing(input)}`);
    return finish(input, sentences, motifs);
  }

  const allowed = after ? allowedMate(input, after.fen()) : null;
  if (allowed) {
    motifs.push("mat");
    sentences.push(allowed);
    if (input.bestSan) {
      sentences.push(`Le coup conseillé était ${input.bestSan}.`);
    }
    return finish(input, sentences, motifs);
  }

  if (best && bestBoard) {
    const forks = forkTargets(bestBoard, best.to);
    if (forks.length >= 2) {
      motifs.push("fourchette");
      const piece = PIECE_FR[best.piece];
      const named = forks
        .slice(0, 2)
        .map((target) => namedPiece(target.type, target.square))
        .join(" et ");
      sentences.push(
        `${best.san.replace(/[+#]$/, "")} est une fourchette : ${piece.article} ${piece.name} attaque ${named}.`,
      );
      sentences.push(`${input.playedSan} ne crée pas cette double menace. ${swing(input)}`);
      return finish(input, sentences, motifs);
    }

    const skew = skewer(bestBoard, best.to);
    if (skew) {
      motifs.push("enfilade");
      sentences.push(
        `${best.san.replace(/[+#]$/, "")} est une enfilade : le roi en ${skew.front} doit quitter la ligne, et ${namedPiece(skew.rearType, skew.rear)} derrière se fait prendre.`,
      );
      sentences.push(`${input.playedSan} ne crée pas cette enfilade. ${swing(input)}`);
      return finish(input, sentences, motifs);
    }

    const kind = checkKind(bestBoard, best.to);
    if (kind === "double" || kind === "decouvert") {
      motifs.push(kind === "double" ? "echec-double" : "echec-decouvert");
      const label = kind === "double" ? "un échec double" : "un échec découvert";
      sentences.push(`${best.san.replace(/[+#]$/, "")} est ${label} : la pièce qui bouge ${kind === "double" ? "attaque aussi le roi" : "n'attaque pas le roi, une autre le met en échec"}.`);
      sentences.push(`${input.playedSan} ne le fait pas. ${swing(input)}`);
      return finish(input, sentences, motifs);
    }

    const zwischen = zwischenzug(input);
    if (zwischen) {
      motifs.push("coup-intermediaire");
      sentences.push(zwischen);
      sentences.push(swing(input));
      return finish(input, sentences, motifs);
    }

    const pin = brokenPin(input) ?? createdPin(input);
    if (pin) {
      motifs.push("clouage");
      sentences.push(pin);
      sentences.push(swing(input));
      return finish(input, sentences, motifs);
    }
  }

  const hanging = hangingStory(input);
  if (hanging) {
    motifs.push("piece-en-prise");
    sentences.push(hanging);
    sentences.push(swing(input));
    return finish(input, sentences, motifs);
  }

  const promotion = promotionStory(input);
  if (promotion) {
    motifs.push("promotion");
    sentences.push(promotion);
    sentences.push(swing(input));
    return finish(input, sentences, motifs);
  }

  const material = materialStory(input);
  if (material) {
    motifs.push("materiel");
    sentences.push(material);
    sentences.push(`${input.playedSan} ne suit pas cette ligne. ${swing(input)}`);
    return finish(input, sentences, motifs);
  }

  if (input.phase === "finale") {
    motifs.push("finale");
    sentences.push(`En finale, ${input.playedSan} lâche l'évaluation. ${bestAdvice(input)} ${swing(input)}`);
    return { text: sentences.join(" "), motifs };
  }

  sentences.push(`${bestAdvice(input)} ${swing(input)}`);
  if (input.pvSan && input.bestSan && input.pvSan !== input.bestSan) {
    sentences.push(`Ligne : ${trimLine(input.pvSan)}.`);
  }
  return { text: sentences.join(" "), motifs };
}

function finish(input: ExplainInput, sentences: string[], motifs: Motif[]): MoveExplanation {
  if (input.phase === "finale" && sentences[0] && !motifs.includes("finale")) {
    motifs.push("finale");
    const first = sentences[0];
    const chessMove = /^[NBRQKOa-h]/.test(first);
    const body = chessMove ? first : `${first.charAt(0).toLowerCase()}${first.slice(1)}`;
    sentences[0] = `En finale, ${body}`;
  }
  return { text: sentences.filter(Boolean).join(" "), motifs };
}

function missedMate(input: ExplainInput) {
  const mate = moverMate(input.before, input.color);
  const fromPv = mateLine(input.fenBefore, input.pvUci);
  if (fromPv) {
    return `Tu avais mat en ${Math.ceil(fromPv.length / 2)} : ${fromPv.join(" ")}.`;
  }

  if (mate == null || mate <= 0) {
    return null;
  }

  if (mate <= 2) {
    const proved = findForcedMate(input.fenBefore, mate);
    if (proved) {
      return `Tu avais mat en ${Math.ceil(proved.length / 2)} : ${proved.join(" ")}.`;
    }
  }

  return `Le moteur annonce mat en ${mate} avant ce coup. La ligne donnée ne va pas jusqu'au mat, je ne décris pas une suite non vérifiée.`;
}

function allowedMate(input: ExplainInput, fenAfter: string) {
  const proved = findForcedMate(fenAfter, 1) ?? (moverMate(input.after, input.color) === -2 ? findForcedMate(fenAfter, 2) : null);
  if (proved) {
    return `${input.playedSan} autorise un mat en ${Math.ceil(proved.length / 2)} : ${proved.join(" ")}.`;
  }

  const mate = moverMate(input.after, input.color);
  if (mate != null && mate < 0) {
    return `${input.playedSan} autorise un mat en ${-mate}, annoncé par le moteur. La suite n'est pas dans la ligne principale, je ne l'invente pas.`;
  }

  return null;
}

function zwischenzug(input: ExplainInput) {
  if (!input.bestUci || input.pvUci.length < 3) {
    return null;
  }

  const before = loadChess(input.fenBefore);
  if (!before) {
    return null;
  }

  const loose = profitableCaptures(before).filter((capture) => capture.uci.slice(0, 4) !== input.bestUci?.slice(0, 4));
  if (loose.length === 0) {
    return null;
  }

  const best = playUci(before, input.bestUci);
  if (!best || !before.isCheck()) {
    return null;
  }

  const looseSquares = new Set(loose.map((capture) => capture.to));
  const replay = loadChess(input.fenBefore);
  if (!replay) {
    return null;
  }

  let captureSan = "";
  for (let index = 0; index < input.pvUci.length && index < 6; index += 1) {
    const move = playUci(replay, input.pvUci[index]);
    if (!move) {
      break;
    }
    if (move.color === input.color && move.captured && looseSquares.has(move.to)) {
      captureSan = move.san.replace(/[+#]$/, "");
      break;
    }
  }

  if (!captureSan) {
    return null;
  }

  const victim = loose.find((capture) => captureSan.includes(capture.to)) ?? loose[0];
  return `Coup intermédiaire : ${best.san} donne échec avant ${captureSan}, qui prend ${namedPiece(victim.victim, victim.to)}. La capture immédiate n'est pas le bon ordre.`;
}

function brokenPin(input: ExplainInput) {
  const before = loadChess(input.fenBefore);
  if (!before) {
    return null;
  }

  const from = input.playedUci.slice(0, 2) as Square;
  const pin = pinsAgainst(before, input.color).find((item) => item.pinned === from && !item.absolute && item.againstType === "q");
  if (!pin) {
    return null;
  }

  const played = playUci(before, input.playedUci);
  if (!played) {
    return null;
  }

  const looseQueen = profitableCaptures(before).some((capture) => capture.to === pin.against && capture.victim === "q");
  if (!looseQueen) {
    return null;
  }

  return `${namedPiece(pin.pinnedType, from)} était cloué sur ${namedPiece(pin.againstType, pin.against)}. ${input.playedSan} le déplace et la dame se fait prendre. ${input.bestSan ? `Le coup conseillé était ${input.bestSan}.` : ""}`.trim();
}

function createdPin(input: ExplainInput) {
  if (!input.bestUci) {
    return null;
  }

  const before = loadChess(input.fenBefore);
  const after = loadChess(input.fenBefore);
  if (!before || !after) {
    return null;
  }

  const enemy = opposite(input.color);
  const previous = new Set(pinsAgainst(before, enemy).filter((pin) => pin.absolute).map((pin) => pin.pinned));
  const best = playUci(after, input.bestUci);
  if (!best) {
    return null;
  }

  const created = pinsAgainst(after, enemy).filter((pin) => pin.absolute && !previous.has(pin.pinned));
  const pin = created.find((item) => item.by === best.to) ?? created[0];
  if (!pin || !pieceAttacks(after, pin.by, pin.pinned)) {
    return null;
  }

  return `${best.san.replace(/[+#]$/, "")} cloue ${namedPiece(pin.pinnedType, pin.pinned)} sur le roi. ${input.playedSan} ne crée pas ce clouage.`;
}

function hangingStory(input: ExplainInput) {
  const before = loadChess(input.fenBefore);
  if (!before) {
    return null;
  }

  const missed = profitableCaptures(before);
  const bestTakes = input.bestUci
    ? missed.find((capture) => capture.uci.slice(0, 4) === input.bestUci?.slice(0, 4))
    : undefined;

  if (bestTakes && bestTakes.uci.slice(0, 4) !== input.playedUci.slice(0, 4)) {
    return `${bestTakes.san} prend ${namedPiece(bestTakes.victim, bestTakes.to)}, qui est en prise. ${input.playedSan} laisse cette pièce.`;
  }

  const played = playUci(before, input.playedUci);
  if (!played) {
    return null;
  }

  const hung = profitableCaptures(before);
  const worst = hung.find((capture) => !wasLoose(input.fenBefore, input.color, capture.to));
  if (!worst) {
    return null;
  }

  return `Après ${input.playedSan}, ${namedPiece(worst.victim, worst.to)} est en prise. ${input.bestSan ? `${input.bestSan} évite ça.` : ""}`.trim();
}

function wasLoose(fen: string, color: Side, square: Square) {
  const chess = loadChess(fen);
  if (!chess || chess.turn() !== color) {
    return false;
  }

  const parts = fen.split(" ");
  parts[1] = opposite(color);
  parts[3] = "-";
  const flipped = loadChess(parts.join(" "));
  if (!flipped || flipped.isCheck()) {
    return false;
  }

  return profitableCaptures(flipped).some((capture) => capture.to === square);
}

function promotionStory(input: ExplainInput) {
  if (input.playedUci.length >= 5) {
    return null;
  }

  const bestPromotes = (input.bestUci?.length ?? 0) >= 5;
  const later = input.pvUci.find((uci, index) => index % 2 === 0 && uci.length >= 5);
  if (!bestPromotes && !later) {
    return null;
  }

  const piece = promotionName((bestPromotes ? input.bestUci : later)?.[4]);
  return `${input.playedSan} rate la promotion. Le coup conseillé mène à une promotion en ${piece}.`;
}

function materialStory(input: ExplainInput) {
  const net = stableMaterialGain(input.fenBefore, input.pvUci, input.color);
  if (net < 1) {
    return null;
  }

  const queen = opponentQueenCaptured(input.fenBefore, input.pvUci, input.color) && net >= 5;
  const line = trimLine(input.pvSan || input.bestSan || "");
  if (queen) {
    return `La ligne principale gagne la dame${line ? ` : ${line}` : ""}.`;
  }

  const pawns = net === 1 ? "1 pion" : `${net} pions`;
  return `La ligne principale gagne ${pawns} de matériel${line ? ` : ${line}` : ""}.`;
}

function bestAdvice(input: ExplainInput) {
  if (!input.bestUci || !input.bestSan) {
    return "Le moteur ne donne pas de coup conseillé.";
  }

  const chess = loadChess(input.fenBefore);
  const move = chess ? playUci(chess, input.bestUci) : null;
  if (!move || !chess) {
    return `Le coup conseillé est ${input.bestSan}.`;
  }

  if (move.san === "O-O" || move.san === "O-O-O") {
    return `${move.san} met le roi à l'abri. ${input.playedSan} ne le fait pas.`;
  }

  if (chess.isCheck()) {
    return `${move.san} donne échec. ${input.playedSan} non.`;
  }

  if (move.captured) {
    return `${move.san} prend ${namedPiece(move.captured, move.to)}. ${input.playedSan} ne le fait pas.`;
  }

  const home = move.color === "w" ? "1" : "8";
  if ((move.piece === "n" || move.piece === "b") && move.from.endsWith(home) && input.phase === "ouverture") {
    const piece = PIECE_FR[move.piece];
    return `${move.san} développe ${piece.article} ${piece.name}. ${input.playedSan} ne développe pas cette pièce.`;
  }

  if (move.piece === "p" && ["c4", "c5", "d4", "d5", "e4", "e5"].includes(move.to)) {
    return `${move.san} prend de l'espace au centre. ${input.playedSan} non.`;
  }

  return `Le coup conseillé est ${move.san}.`;
}

function swing(input: ExplainInput) {
  return `L'évaluation passe de ${outlook(input.before, input.color)} à ${outlook(input.after, input.color)}.`;
}

function outlook(evaluation: NodeEval, color: Side) {
  const mate = moverMate(evaluation, color);
  if (mate != null && mate > 0) return `mat en ${mate} pour toi`;
  if (mate != null && mate < 0) return `mat en ${-mate} contre toi`;

  const pawns = Math.round(moverCentipawns(evaluation, color)) / 100;
  if (Math.abs(pawns) < 0.05) return "l'égalité";
  const sign = pawns > 0 ? "+" : "-";
  return `${sign}${Math.abs(pawns).toFixed(1)} pour toi`;
}

function moverMate(evaluation: NodeEval, color: Side) {
  if (evaluation.mate == null) {
    return null;
  }
  return color === "w" ? evaluation.mate : -evaluation.mate;
}

export function namedPiece(type: PieceSymbol, square: Square) {
  const piece = PIECE_FR[type];
  return `${piece.article} ${piece.name} en ${square}`;
}

function promotionName(piece: string | undefined) {
  if (piece === "q") return "dame";
  if (piece === "r") return "tour";
  if (piece === "b") return "fou";
  if (piece === "n") return "cavalier";
  return "dame";
}

function trimLine(line: string) {
  const parts = line.split(/\s+/).filter(Boolean).slice(0, 8);
  return parts.join(" ");
}
