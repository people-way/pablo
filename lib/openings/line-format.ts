/** English SAN, same notation as the revue. The sentences around it are French. */

export function formatSans(sans: string[]) {
  const parts: string[] = [];

  sans.forEach((san, index) => {
    const moveNumber = Math.floor(index / 2) + 1;
    parts.push(index % 2 === 0 ? `${moveNumber}. ${san}` : san);
  });

  return parts.join(" ");
}

export function formatPly(sans: string[], ply: number) {
  const san = sans[ply - 1];

  if (!san || ply < 1) {
    return "";
  }

  const moveNumber = Math.floor((ply - 1) / 2) + 1;
  return ply % 2 === 1 ? `${moveNumber}. ${san}` : `${moveNumber}... ${san}`;
}

export function parties(count: number) {
  return count === 1 ? "1 partie" : `${count} parties`;
}

export function avecCouleur(color: "white" | "black") {
  return color === "white" ? "avec les Blancs" : "avec les Noirs";
}

export function formatRecord(wins: number, draws: number, losses: number) {
  const bits: string[] = [];

  if (wins > 0) {
    bits.push(wins === 1 ? "1 gain" : `${wins} gains`);
  }
  if (draws > 0) {
    bits.push(draws === 1 ? "1 nulle" : `${draws} nulles`);
  }
  if (losses > 0) {
    bits.push(losses === 1 ? "1 défaite" : `${losses} défaites`);
  }

  return bits.length > 0 ? bits.join(", ") : "aucune partie décidée";
}

export function formatPeriod(archives: string[]) {
  if (archives.length === 0) {
    return "la période demandée";
  }

  const first = monthLabel(archives[0]);
  const last = monthLabel(archives[archives.length - 1]);
  return first === last ? first : `${first} – ${last}`;
}

function monthLabel(archive: string) {
  const match = archive.match(/(\d{4})\/(\d{2})/);

  if (!match) {
    return archive;
  }

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
