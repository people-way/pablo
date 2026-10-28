import { avecCouleur, formatPly, formatRecord, parties } from "@/lib/openings/line-format";
import type { ColorName, LineStats, OpeningAnchor, WeaknessKind } from "@/lib/openings/repertoire-types";

type Plan = { white?: string; black?: string };

/**
 * Concrete plans for a ~2000 player aiming at 2400.
 * The move to play in a given position comes from the book line, not from this text.
 */
const PLANS: Record<string, Plan> = {
  italian_game: {
    white:
      "Le fou en c4 vise f7 et prépare d4. Après un coup lent (...h6, ...a6, ...d6), tu développes Nc3, tu roques, et tu ouvres le centre avec d3 puis d4. Tu ne recules pas le fou sur b3 sans une raison.",
    black:
      "Contre Bc4, le coup de répertoire est ...Bc5 ou ...Nf6, pas un coup de pion. ...Bc5 tient le centre et vise f2. Si les Blancs jouent c3, tu réponds ...Nf6 et tu attaques e4 avant qu'ils n'aient d4.",
  },
  ruy_lopez: {
    white:
      "L'Espagnole, c'est la pression longue sur e5. Après ...a6, Ba4, tu ne prends pas en c6 sans suite. Tu roques, Re1, et tu prépares d4. Le fou espagnol reste une pièce, pas un échange automatique.",
    black:
      "Après Bb5, ...a6 4.Ba4 Nf6 est la ligne. Tu ne joues pas ...d6 trop tôt : ça t'enferme. Si tu veux casser, c'est ...b5 puis ...d5, ou la Berlin si tu tiens la finale. Choisis-en une et arrête d'alterner.",
  },
  kings_gambit: {
    white:
      "Le gambit du roi ne se joue pas à moitié. Après ...exf4 tu développes Nf3, Bc4 ou d4, et tu attaques f7 avant de récupérer le pion. Si tu joues lentement, le pion de moins est juste un pion de moins.",
    black:
      "Accepte avec ...exf4, puis ...g5 seulement quand le roi blanc n'est pas déjà en train de rentrer. Le plan simple et fort : ...Nf6, ...d5, et tu rends le pion pour sortir les pièces. Ne garde pas le pion au prix du roque.",
  },
  vienna_game: {
    white:
      "Nc3 avant Nf3, c'est pour f4 ou pour Bc4 sans te faire embêter sur e4. Tu choisis f4 ou la ligne calme Bc4, tu ne mélanges pas les deux au coup 4.",
    black:
      "Contre la Viennoise, ...Nf6 attaque e4 tout de suite. Tu ne joues pas ...Bc5 avant d'avoir regardé si f4 ou Ng5 arrive. ...d5 est la rupture quand le centre blanc est encore mou.",
  },
  sicilian_najdorf: {
    white:
      "Dans la Najdorf tu choisis un 6e coup et tu le tiens : Be3 et f3 (attaque anglaise), ou Bg5. Tu ne joues pas Be2 un jour et h3 le lendemain. L'attaque est à l'aile roi, le contre-jeu noir est ...b5.",
    black:
      "...a6 prépare ...b5, ce n'est pas un coup d'attente. Contre Be3 tu joues ...e5 puis ...Be6, et ...b5 avant que f5 ne rentre. Contre Bg5, tu ne prends pas le pion b2 sans la suite : ou tu la connais, ou tu joues ...e6, ...Be7, ...Nbd7.",
  },
  sicilian_dragon: {
    white:
      "Contre le Dragon tu joues Be3, f3, Qd2, roque dame, et h4-h5. Le fou de cases noires noir est la pièce à échanger ou à enfermer. Si tu roques petit, tu joues son ouverture.",
    black:
      "Le Dragon sans le fou g7 n'est pas un Dragon. Tu ne l'échanges pas. Le contre-jeu est ...Rc8 et ...b5, ou la sacrifice en c3 quand sa dame et son roi sont du même côté. Si tu ne calcules pas ...Rxc3, joue autre chose.",
  },
  sicilian_scheveningen: {
    white:
      "La Scheveningen se presse avec Be3, f4 ou l'attaque anglaise f3-g4. Tu ne laisses pas ...d5 se jouer gratuitement : c'est la libération noire.",
    black:
      "...e6 et ...d6, puis ...a6 et ...Qc7. La rupture est ...d5 quand tu as assez de pièces derrière. Tu ne pousses pas ...e5 trop tôt : tu laisses un trou en d5.",
  },
  sicilian_kan: {
    white:
      "Contre le Kan, Nc3, Bc4 ou Be2, et tu empêches ...d5. Le centre d4-e4 doit rester, sinon les Noirs ont le plus facile.",
    black:
      "Le Kan, c'est ...a6, ...Qc7, ...Nf6, et ...b5 ou ...d5. Tu ne sors pas le cavalier en c6 devant le pion c : il bloque ...b5. ...d5 est le coup qui justifie toute la ligne.",
  },
  french_defense: {
    white:
      "Contre la Française tu choisis une structure et tu la joues : e5 (avance) ou Nc3. Dans l'avance, le plan est Nf3, Be2 ou Bd3, et le roque, pendant que tu surveilles ...c5. Tu ne prends pas en d5 sans raison : l'échange soulage son fou dame.",
    black:
      "La Française se joue avec ...c5 contre d4, pas avec des coups d'attente. Le fou c8 est le problème : tu le sors par ...b6 et ...Ba6, ou par ...Bd7-e8, tu ne le laisses pas sur c8 jusqu'à la finale. Dans l'avance, ...c5 puis ...Qb6 avant de fermer les yeux.",
  },
  caro_kann: {
    white:
      "Contre la Caro, la ligne principale est d4, Nc3, et la poussée e5 ou l'échange. Après ...Bf5 tu joues Nf3, Be2 ou Bd3, et tu ne laisses pas son fou vivre sur la diagonale sans h3 ou g4 au bon moment.",
    black:
      "...c6 et ...d5, puis tu développes le fou avant de fermer avec ...e6. Contre l'avance, ...Bf5, ...e6, ...c5. Tu ne joues pas ...e6 avant le fou : c'est le même mauvais fou que la Française, sans la structure qui le justifie.",
  },
  kings_indian_defense: {
    white:
      "Contre l'Est-indienne tu prends de l'espace au centre, Be2, O-O, et tu choisis : e4 et le jeu dame, ou c5 si tu fermes. Tu ne joues pas sans plan des coups de pion à l'aile roi pendant qu'il prépare ...f5.",
    black:
      "L'Est-indienne est une course. Tu roques, tu joues ...e5 ou ...c5, et ...f5 seulement quand son jeu dame est déjà engagé. ...f5 trop tôt, c'est une attaque dans le vide. Le cavalier f6 va souvent en e8 ou e7 pour laisser passer le pion f.",
  },
  nimzo_indian: {
    white:
      "Contre ...Bb4 tu décides tout de suite : a3 pour la paire de fous, ou Qc2 / Nf3 pour garder la structure. Si tu prends en c3, tu joues le centre avec e4 ou c4, tu ne rends pas la paire sans activité.",
    black:
      "...Bb4 cloue le cavalier et t'empêche e4 facile. Après a3, ...Bxc3+ puis ...d5 ou ...c5. Tu ne rends pas le fou sans doubler ses pions ou sans obtenir ...d5 dans la foulée.",
  },
  queens_gambit_declined: {
    white:
      "Le gambit dame refusé : tu développes Nf3, Be2 ou Bd3, tu roques, et la rupture est e4 ou la minorité b4-b5. Tu ne prends pas en c5 trop tôt.",
    black:
      "...d5, ...e6, ...Nf6, ...Be7, roque. La libération est ...c5 ou ...e5, pas ...b6 tout de suite. Tu ne sors pas la dame devant le centre.",
  },
  queens_gambit_accepted: {
    white:
      "Après ...dxc4 tu reprends le pion avec e3, Bxc4, et tu joues le centre d4-e4. Le pion c4 n'est pas un cadeau : c'est un tempo pour ...a6 et ...b5, que tu dois avoir prévu.",
    black:
      "Tu prends en c4 pour ...a6, ...b5 et ...c5 ou ...Bb7. Si tu rends le pion sans ces coups, tu as juste perdu un tempo. Le plan, c'est le jeu de pièces sur les cases claires.",
  },
  london_system: {
    white:
      "Le Londres : d4, Nf3, Bf4, e3, c3, Nbd2, Be2 ou Bd3, roque. Ensuite c4 ou e4, pas h3 et a3 en série. Le fou f4 doit sortir avant e3.",
    black:
      "Contre le Londres tu frappes le centre avec ...c5 ou ...d5 et ...Qb6, qui vise b2 et gêne son développement. Tu ne copies pas sa structure sans une rupture.",
  },
  grunfeld_defense: {
    white:
      "Contre la Grünfeld tu prends le centre d4-e4 et tu le défends. Après ...Nxd5 ou ...cxd5, tu ne rends pas e4. Le plan noir est la pression sur d4 : tu développes Be3, Qd2, et tu roques avant de pousser.",
    black:
      "...Nf6, ...g6, ...d5. Tu échanges le pion c ou tu frappes d4 avec ...Bg7 et ...c5. Si tu joues ...d5 sans suite contre le centre blanc, tu subis. La pièce clé est le fou g7 sur la grande diagonale.",
  },
  benoni_defense: {
    white:
      "Contre la Benoni tu joues e4, Nf3, Be2, et la poussée f4 ou le jeu dame avec a4. Tu ne laisses pas ...b5 sans a4.",
    black:
      "La Benoni, c'est ...c5, ...d6, ...g6, et la rupture ...b5 ou ...e6 puis ...e5. Le cavalier g7 et la colonne semi-ouverte c sont ton jeu. Tu ne fermes pas avec ...e5 avant d'avoir ...a6 et ...Re8.",
  },
  dutch_defense: {
    white:
      "Contre le Hollandais, d4, c4, Nc3, et tu surveilles e4. Le roi noir est souvent faible sur la diagonale : Be2, O-O, et tu ne prends pas en e5 trop vite.",
    black:
      "...f5 annonce un jeu à l'aile roi. Tu développes ...Nf6, ...e6, ...Be7, tu roques, et seulement ensuite ...d6 et ...Qe8 vers h5. ...f5 sans développement, c'est un roi faible.",
  },
  english_opening: {
    white:
      "L'Anglaise : c4, Nc3, g3, Bg2, Nf3, roque. Tu frappes le centre plus tard avec d4, ou tu joues la structure avec une colonne c. Tu ne joues pas c4 puis d4 au coup 2 sans idée.",
    black:
      "Contre c4, tu choisis une structure tout de suite : ...e5 (renversée), ...c5, ou ...Nf6 et ...e6. ...e5 puis ...Nc6, ...g6 ou ...Bb4. Tu ne subis pas sa grande diagonale sans ...c6 ou ...d5.",
  },
  reti_opening: {
    white:
      "Le Réti, c'est Nf3, c4, g3, Bg2, et la pression sur d5. Tu ne le transformes pas en Londres au coup 3. Le plan est d4 au moment où son centre est fixé.",
    black:
      "Contre Nf3 tu peux jouer ...d5 et ...Nf6, ou ...c5. Tu occupes le centre avant qu'il ne te le prenne en fianchetto. ...d5, ...c6, ...Bf5 ou ...Bg4 est une façon claire de jouer.",
  },
  queens_indian: {
    white:
      "Contre l'Ouest-indienne, tu décides : b3 et Bb2, ou d4-e4 pour prendre le centre. Le fou b7 vise e4 : tu le bloques ou tu l'ouvres à ton avantage, tu ne l'ignores pas.",
    black:
      "...b6 et ...Bb7 contre le pion e4 ou d5. Tu joues ...e6, ...Nf6, ...Be7, et ...c5 ou ...d5. Le fou b7 est la raison de l'ouverture : s'il tape sur son propre pion, la ligne ne sert à rien.",
  },
  scandinavian_defense: {
    white:
      "Contre la Scandinave tu prends en d5 et tu développes plus vite que sa dame. Après ...Qxd5, Nc3 gagne un tempo. Tu ne chasse pas la dame avec trois coups de pion.",
    black:
      "...d5 se joue avec une suite : ...Qxd5 puis ...Qa5, ou ...Nf6 pour reprendre plus tard. Tu ne promènes pas la dame. Le plan est ...c6, ...Bf5, ...e6, roque, et un jeu solide de pion de moins en espace mais pas en temps.",
  },
  alekhine_defense: {
    white:
      "Contre l'Alekhine tu avances e5 et tu construis d4, c4, Nf3. L'espace est ton avantage : tu ne le rends pas avec un échange au centre sans pièce derrière.",
    black:
      "...Nf6 provoque e5, puis ...Nd5 et ...d6 pour casser. Tu dois frapper le centre tout de suite. Si tu laisses e5-d4-c4 sans ...d6, tu es étouffé.",
  },
  pirc_defense: {
    white:
      "Contre la Pirc tu prends le centre e4-d4, Be3, Qd2, et tu choisis l'attaque h4 ou le jeu classique Nf3, Be2. Tu ne joues pas passif : son ...e5 ou ...c5 arrive.",
    black:
      "...d6, ...Nf6, ...g6, ...Bg7, roque, puis ...e5 ou ...c5. Le fou g7 travaille quand le centre s'ouvre. Tu ne pousses pas ...e5 avant d'avoir roqué.",
  },
  budapest_gambit: {
    white:
      "Contre le Budapest tu prends en e5, tu rends ou tu garde le pion avec Nf3 et Be2, et tu développes. Le pion en plus ne vaut rien si son cavalier en e5 ou g4 te cloue.",
    black:
      "...e5 est un gambit : après dxe5 tu joues ...Ng4 et tu récupères, ou tu gardes l'activité. Tu ne le joues pas pour rendre le pion sans pièces actives. La suite ...Ng4, ...Nc6, ...Bc5 est le minimum.",
  },
  four_knights_game: {
    white:
      "Les quatre cavaliers : tu développes, tu roques, et tu choisis Bb5 ou Bc4. L'idée est la solidité, puis d4. Tu ne sors pas la dame.",
    black:
      "Tu copies le développement, tu roques, et tu frappes avec ...d5 quand son centre bouge. ...Bb4 cloue le cavalier c3 si tu veux casser la symétrie.",
  },
  birds_opening: {
    white:
      "L'ouverture Bird, f4, se joue comme un Hollandais inversé : Nf3, g3, Bg2, O-O, et d3 ou b3. Tu ne pousses pas f4 puis e4 sans pièce.",
    black:
      "Contre f4, ...d5 et ...Nf6, ou ...g6 et ...Bg7. Tu occupes e5. Son aile roi est un peu ouverte : tu ne te précipites pas, tu développes d'abord.",
  },
  larsen_opening: {
    white:
      "L'ouverture Larsen, b3 et Bb2, vise e5 et le centre. Tu joues e3 ou e4, Nf3, et tu roques. Le fou b2 sans centre est une pièce morte.",
    black:
      "Contre b3 tu joues ...e5 ou ...d5 tout de suite, pour que son fou b2 tape sur un pion défendu. ...Nf6, ...Nc6, ...d5, et tu as le centre.",
  },
  tarrasch_defense: {
    white:
      "Contre la Tarrasch, l'isolé d5 est la cible. Tu échanges en d5 au bon moment, tu mets une pièce devant le pion, et tu joue la finale. Tu ne le laisses pas pousser ...d4 avec activité.",
    black:
      "La Tarrasch, c'est ...c5 contre le gambit dame, puis un pion d isolé en échange de l'activité. Tu joues ...Nf6, ...Nc6, ...Be7 ou ...Bb4+, roque, et ...d4 si ses pièces dorment. Sans activité, l'isolé perd.",
  },
};

const GENERIC =
  "À ce niveau, une ligne répétée sans coup de remplacement te coûte plus cher qu'une ligne inférieure que tu comprends. Tu choisis un coup, tu apprends la réponse adverse, et tu la tiens dix parties avant d'en changer.";

function planText(openingId: string, color: ColorName) {
  const plan = PLANS[openingId];
  return plan?.[color] ?? plan?.white ?? plan?.black ?? null;
}

export function planFor(openingId: string | null, color: ColorName, sans: string[] = []): string {
  if (openingId) {
    const specific = planText(openingId, color);
    if (specific) {
      return specific;
    }
  }
  return planFromSans(sans, color) ?? GENERIC;
}

function planFromSans(sans: string[], color: ColorName): string | null {
  if (sans[0] === "e4" && sans[1] === "c6") {
    return planText("caro_kann", color);
  }
  if (sans[0] === "e4" && sans[1] === "e6") {
    return planText("french_defense", color);
  }
  if (sans[0] === "e4" && sans[1] === "d5") {
    return planText("scandinavian_defense", color);
  }
  if (sans[0] === "e4" && sans[1] === "c5") {
    return color === "white"
      ? "Contre ...c5 tu choisis tout de suite : d4, la Sicilienne ouverte, ou Bb5 au coup 3, le Rossolimo. Si Bb5 te rapporte déjà, tu le tiens et tu apprends les réponses ...g6 et ...e6. Tu ne changes pas de système au milieu de la ligne."
      : "La Sicilienne, c'est un système, pas un premier coup. ...d6 mène à la Najdorf ou au Dragon, ...Nc6 au Rossolimo ou à la Sveshnikov. Tu en choisis un et tu le joues dix parties.";
  }
  if (sans[0] === "e4" && sans[1] === "e5") {
    return color === "white"
      ? "Après 1.e4 e5 tu joues Nf3 puis soit Bb5, soit Bc4. Le coup suivant est le répertoire. Contre ...d6 tu ouvres avec d4 pendant que son fou est encore chez lui."
      : "Contre 1.e4 e5, ...Nc6 est le coup. ...d6 au deuxième coup t'enferme. Tu développes le cavalier, tu sors un fou, tu roques.";
  }
  if (sans[0] === "d4" || sans[1] === "d4") {
    return color === "white"
      ? "Avec 1.d4 le répertoire est le coup 2 et le coup 3 : gambit dame, ou un système. Tu ne les mélanges pas d'une partie à l'autre."
      : "Contre 1.d4 tu tiens une structure jusqu'au roque : Nimzo, Est-indienne, ou refus du gambit. Le plan compte plus que le nom.";
  }
  return null;
}

export function coachWeakness(input: {
  color: ColorName;
  openingName: string;
  variation: string | null;
  openingId: string | null;
  kind: WeaknessKind;
  sans: string[];
  ply: number;
  playedSan: string;
  playedByUser: boolean;
  insteadSan: string | null;
  stats: LineStats;
  userExits: number;
  betterTry: { san: string; games: number; scorePct: number } | null;
  splits: Array<{ san: string; games: number; scorePct: number }>;
  contrast: { san: string; games: number; scorePct: number; insteadOf: string } | null;
}) {
  const idea = planFor(input.openingId, input.color, input.sans);
  const title = input.variation ? `${input.openingName} · ${input.variation}` : input.openingName;
  const label = formatPly(input.sans, input.ply);
  const record = formatRecord(input.stats.wins, input.stats.draws, input.stats.losses);
  const accuracy =
    input.stats.avgAccuracy != null && input.stats.accuracyGames > 0
      ? ` Précision Chess.com sur ${parties(input.stats.accuracyGames)} : ${input.stats.avgAccuracy}%.`
      : "";

  let focus: string;

  if (input.kind === "early-exit") {
    focus = `Tu sors de la théorie au coup ${label}, dans ${input.userExits} parties sur ${input.stats.games}.`;
  } else if (input.kind === "opponent-reply") {
    focus = `La réponse qui te gêne, c'est ${label}. Là-dessus tu marques ${input.stats.scorePct}% des points.`;
  } else if (input.kind === "early-signal") {
    focus = `${parties(input.stats.games)} seulement, mais le score est déjà à ${input.stats.scorePct}%. C'est un signal, pas encore un verdict.`;
  } else {
    focus = `La ligne va jusqu'à ${label}, et le score ne suit pas.`;
  }

  const contrast = input.contrast
    ? ` Quand la partie part sur ${input.contrast.san} au lieu de ${input.contrast.insteadOf}, tu marques ${input.contrast.scorePct}% en ${parties(input.contrast.games)}. Ce n'est pas là qu'on travaille.`
    : "";
  const splits =
    input.splits.length >= 2
      ? ` Ensuite : ${input.splits
          .slice(0, 3)
          .map((split) => `${split.san} ${split.scorePct}% en ${parties(split.games)}`)
          .join(", ")}.`
      : "";

  const diagnosis = `${title} ${avecCouleur(input.color)} : ${parties(input.stats.games)}, ${input.stats.scorePct}% des points (${record}). ${focus}${accuracy}${contrast}${splits}`;

  let whatToPlay: string;

  if (input.insteadSan && input.playedByUser) {
    whatToPlay = `Joue ${input.insteadSan} à la place de ${input.playedSan}. ${idea}`;
  } else if (input.insteadSan) {
    whatToPlay = `Réponds ${input.insteadSan}. ${idea}`;
  } else if (input.betterTry) {
    whatToPlay = `Quand tu joues ${input.betterTry.san} à cet endroit, tu marques ${input.betterTry.scorePct}% en ${parties(input.betterTry.games)}. C'est ce coup-là que tu répètes. ${idea}`;
  } else {
    whatToPlay = idea;
  }

  return { diagnosis, whatToPlay, idea };
}

export function coachSummary(input: {
  username: string;
  gameCount: number;
  scorePct: number;
  periodLabel: string;
  weaknesses: Array<{ openingName: string; color: ColorName; stats: LineStats }>;
  anchors: OpeningAnchor[];
}) {
  const thin =
    input.gameCount < 12
      ? " L'échantillon est encore mince : je te dis ce que je vois, pas une loi."
      : "";

  if (input.weaknesses.length === 0) {
    return `${input.username}, j'ai lu ${parties(input.gameCount)} sur ${input.periodLabel}, score ${input.scorePct}% des points. Rien de assez répété et de assez mauvais pour que je condamne une ligne. Soit tu varies trop, soit ça tient. Montre-m'en plus.${thin}`;
  }

  const worst = input.weaknesses[0];
  const anchor = input.anchors[0];
  const hold = anchor
    ? ` En face, ${anchor.openingName} ${avecCouleur(anchor.color)} tient : ${parties(anchor.stats.games)}, ${anchor.stats.scorePct}% des points. On n'y touche pas.`
    : "";

  return `${input.username}, j'ai lu ${parties(input.gameCount)} sur ${input.periodLabel}. Score global : ${input.scorePct}% des points. Le trou prioritaire est ${worst.openingName} ${avecCouleur(worst.color)} : ${parties(worst.stats.games)}, ${worst.stats.scorePct}% des points. C'est là qu'on travaille.${hold}${thin}`;
}
