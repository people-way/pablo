import type { ImportedChessComGame } from "@/lib/chess-com";

/** Reserved handles. Analyses under these names are never written to account stats. */
export const SAMPLE_USERNAME = "pablo-sample";
const RESERVED_SAMPLE_USERNAMES = new Set([SAMPLE_USERNAME, "sample"]);

export function isSampleUsername(value: string): boolean {
  return RESERVED_SAMPLE_USERNAMES.has(value.trim().toLowerCase());
}

type SampleSpec = {
  opening: string;
  color: "white" | "black";
  result: "win" | "loss" | "draw";
  date: string;
};

function sampleGame(spec: SampleSpec): ImportedChessComGame {
  return {
    url: null,
    pgn: "",
    date: spec.date,
    result: spec.result,
    resultDetail: spec.result,
    timeControl: "600",
    timeClass: "rapid",
    opponent: "Sample Opponent",
    opponentRating: 2050,
    color: spec.color,
    rated: true,
    rules: "chess",
    openingName: spec.opening,
    ecoCode: null,
    openingFamily: spec.opening,
  };
}

/**
 * Anonymous demo set for `/analyze?sample=1`.
 * Enough games to surface real opening weaknesses without calling Chess.com.
 */
const SAMPLE_SPECS: SampleSpec[] = [
  { opening: "Sicilian Defense", color: "black", result: "loss", date: "2026-09-20T18:00:00.000Z" },
  { opening: "Sicilian Defense", color: "black", result: "loss", date: "2026-09-22T18:00:00.000Z" },
  { opening: "Sicilian Defense", color: "black", result: "loss", date: "2026-09-25T18:00:00.000Z" },
  { opening: "Sicilian Defense", color: "black", result: "win", date: "2026-09-28T18:00:00.000Z" },
  { opening: "Sicilian Defense", color: "black", result: "loss", date: "2026-10-01T18:00:00.000Z" },
  { opening: "French Defense", color: "black", result: "loss", date: "2026-09-21T18:00:00.000Z" },
  { opening: "French Defense", color: "black", result: "loss", date: "2026-09-27T18:00:00.000Z" },
  { opening: "French Defense", color: "black", result: "win", date: "2026-10-02T18:00:00.000Z" },
  { opening: "Italian Game", color: "white", result: "win", date: "2026-09-18T18:00:00.000Z" },
  { opening: "Italian Game", color: "white", result: "win", date: "2026-09-23T18:00:00.000Z" },
  { opening: "Italian Game", color: "white", result: "win", date: "2026-09-29T18:00:00.000Z" },
  { opening: "Italian Game", color: "white", result: "loss", date: "2026-10-03T18:00:00.000Z" },
  { opening: "Italian Game", color: "white", result: "win", date: "2026-10-04T18:00:00.000Z" },
  { opening: "London System", color: "white", result: "win", date: "2026-09-19T18:00:00.000Z" },
  { opening: "London System", color: "white", result: "draw", date: "2026-09-26T18:00:00.000Z" },
  { opening: "London System", color: "white", result: "win", date: "2026-10-05T18:00:00.000Z" },
  { opening: "Caro-Kann Defense", color: "black", result: "win", date: "2026-09-24T18:00:00.000Z" },
  { opening: "Caro-Kann Defense", color: "black", result: "win", date: "2026-09-30T18:00:00.000Z" },
  { opening: "Caro-Kann Defense", color: "black", result: "loss", date: "2026-10-06T18:00:00.000Z" },
];

export const SAMPLE_GAMES: ImportedChessComGame[] = SAMPLE_SPECS.map(sampleGame);
