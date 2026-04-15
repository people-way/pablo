import openingCatalog from "@/lib/openings/catalog.json";

type OpeningCatalogEntry = (typeof openingCatalog)[number];

type OpeningFamilyDefinition = {
  key: string;
  name: string;
  start: string;
  end: string;
  aliases?: string[];
};

export type OpeningLookupResult = {
  key: string;
  name: string;
  catalogEntry: OpeningCatalogEntry | null;
};

const OPENING_FAMILIES: OpeningFamilyDefinition[] = [
  { key: "english-opening", name: "English Opening", start: "A10", end: "A39" },
  { key: "modern-benoni", name: "Modern Benoni", start: "A56", end: "A79", aliases: ["benoni"] },
  { key: "dutch-defense", name: "Dutch Defense", start: "A80", end: "A99" },
  { key: "scandinavian-defense", name: "Scandinavian Defense", start: "B01", end: "B01" },
  { key: "alekhine-defense", name: "Alekhine Defense", start: "B02", end: "B05", aliases: ["alekhine"] },
  { key: "pirc-defense", name: "Pirc / Modern Defense", start: "B06", end: "B09", aliases: ["pirc", "modern defense"] },
  { key: "caro-kann-defense", name: "Caro-Kann Defense", start: "B10", end: "B19", aliases: ["caro-kann"] },
  { key: "sicilian-defense", name: "Sicilian Defense", start: "B20", end: "B99", aliases: ["sicilian"] },
  { key: "vienna-game", name: "Vienna Game", start: "C25", end: "C29", aliases: ["vienna"] },
  { key: "kings-gambit", name: "King's Gambit", start: "C30", end: "C39" },
  { key: "french-defense", name: "French Defense", start: "C00", end: "C19", aliases: ["french"] },
  { key: "italian-game", name: "Italian Game", start: "C50", end: "C55", aliases: ["giuoco piano", "two knights defense"] },
  { key: "ruy-lopez", name: "Ruy Lopez", start: "C60", end: "C99", aliases: ["spanish opening"] },
  { key: "london-system", name: "London System", start: "D02", end: "D05", aliases: ["london"] },
  { key: "queens-gambit", name: "Queen's Gambit", start: "D06", end: "D69", aliases: ["queen's gambit", "queens gambit"] },
  { key: "grunfeld-defense", name: "Grunfeld Defense", start: "D70", end: "D99", aliases: ["grünfeld", "grunfeld"] },
  { key: "queens-indian-defense", name: "Queen's Indian Defense", start: "E12", end: "E19", aliases: ["queen's indian", "queens indian"] },
  { key: "nimzo-indian-defense", name: "Nimzo-Indian Defense", start: "E20", end: "E59", aliases: ["nimzo"] },
  { key: "kings-indian-defense", name: "King's Indian Defense", start: "E60", end: "E99", aliases: ["king's indian", "kings indian"] },
];

export function normalizeEcoCode(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase() ?? "";
  return /^[A-E][0-9]{2}$/.test(normalized) ? normalized : null;
}

export function extractEcoCodeFromUrl(value: string | null | undefined) {
  const match = value?.match(/([A-E][0-9]{2})(?:\/|$)/i);
  return normalizeEcoCode(match?.[1]);
}

export function findCatalogOpeningByEco(ecoCode: string | null | undefined) {
  const normalizedEcoCode = normalizeEcoCode(ecoCode);

  if (!normalizedEcoCode) {
    return null;
  }

  return (
    openingCatalog.find((entry) => entry.eco_codes.includes(normalizedEcoCode)) ?? null
  );
}

export function findCatalogOpeningByName(openingName: string | null | undefined) {
  const normalizedOpeningName = normalizeName(openingName);

  if (!normalizedOpeningName) {
    return null;
  }

  return (
    openingCatalog.find((entry) => {
      const candidateNames = [entry.name, entry.common_name, ...entry.variations.map((variation) => variation.name)];
      return candidateNames.some((candidateName) => normalizeName(candidateName) === normalizedOpeningName);
    }) ?? null
  );
}

export function findCatalogOpening(ecoCode: string | null | undefined, openingName: string | null | undefined) {
  return findCatalogOpeningByEco(ecoCode) ?? findCatalogOpeningByName(openingName);
}

export function getOpeningLookup(ecoCode: string | null | undefined, openingName: string | null | undefined): OpeningLookupResult {
  const normalizedEcoCode = normalizeEcoCode(ecoCode);
  const family = normalizedEcoCode
    ? OPENING_FAMILIES.find((candidate) => compareEcoCodes(normalizedEcoCode, candidate.start) >= 0 && compareEcoCodes(normalizedEcoCode, candidate.end) <= 0) ?? null
    : findFamilyByName(openingName);

  if (family) {
    return {
      key: family.key,
      name: family.name,
      catalogEntry: findCatalogOpening(normalizedEcoCode, openingName),
    };
  }

  const catalogEntry = findCatalogOpening(normalizedEcoCode, openingName);

  if (catalogEntry) {
    return {
      key: slugify(catalogEntry.common_name ?? catalogEntry.name),
      name: catalogEntry.name,
      catalogEntry,
    };
  }

  const fallbackName = openingName?.trim() || "Unknown Opening";

  return {
    key: slugify(fallbackName),
    name: fallbackName,
    catalogEntry: null,
  };
}

function findFamilyByName(openingName: string | null | undefined) {
  const normalizedOpeningName = normalizeName(openingName);

  if (!normalizedOpeningName) {
    return null;
  }

  return (
    OPENING_FAMILIES.find((family) => {
      const aliases = family.aliases ?? [];
      return [family.name, ...aliases].some((candidate) => normalizedOpeningName.includes(normalizeName(candidate)));
    }) ?? null
  );
}

function compareEcoCodes(left: string, right: string) {
  if (left[0] !== right[0]) {
    return left[0].localeCompare(right[0]);
  }

  return Number(left.slice(1)) - Number(right.slice(1));
}

function normalizeName(value: string | null | undefined) {
  return value
    ?.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim() ?? "";
}

function slugify(value: string) {
  return normalizeName(value).replace(/\s+/g, "-");
}
