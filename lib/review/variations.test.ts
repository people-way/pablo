import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Chess } from "chess.js";
import { readSaved, upsertSaved } from "./storage";
import type { SavedReview } from "./types";
import {
  emptyTrail,
  endTrail,
  followOnTrail,
  jumpTrail,
  leaveTrail,
  lineFromUci,
  MAX_VARIATIONS,
  moveCaption,
  openVariation,
  parseTrail,
  playOnTrail,
  stepTrail,
  variationLabel,
} from "./variations";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const PV = ["e2e4", "e7e5", "g1f3", "b8c6"];

function follow(id: string, uci: string[] = PV, anchorPly = 4) {
  return followOnTrail(emptyTrail(), {
    id,
    rootFen: START,
    anchorPly,
    moves: lineFromUci(START, uci),
  });
}

describe("engine lines as variations", () => {
  it("keeps the whole line and lands on the first move", () => {
    const trail = follow("ligne");
    assert.equal(trail.cursor, 1);
    assert.deepEqual(
      trail.variations[0]?.moves.map((move) => move.san),
      ["e4", "e5", "Nf3", "Nc6"],
    );
  });

  it("steps to the end with the existing navigation and clamps there", () => {
    let trail = follow("ligne");
    trail = stepTrail(trail, 1);
    trail = stepTrail(trail, 1);
    assert.equal(trail.cursor, 3);
    assert.equal(trail.variations[0]?.moves[trail.cursor - 1]?.san, "Nf3");
    trail = endTrail(trail);
    assert.equal(trail.cursor, 4);
    assert.equal(stepTrail(trail, 1).cursor, 4);
    assert.equal(jumpTrail(trail, 0).cursor, 0);
  });

  it("stops a line at the first illegal move", () => {
    assert.equal(lineFromUci(START, ["e2e4", "e2e4", "g1f3"]).length, 1);
  });

  it("numbers white moves and black's first move", () => {
    const moves = lineFromUci(START, PV);
    assert.equal(moveCaption(START, moves, 0), "1. e4");
    assert.equal(moveCaption(START, moves, 1), "e5");
    assert.equal(moveCaption(START, moves, 2), "2. Nf3");
  });
});

describe("explored variations", () => {
  it("keeps the previous line when a move diverges", () => {
    const opened = follow("italienne");
    const branched = playOnTrail(leaveTrail(opened), {
      id: "sicilienne",
      rootFen: START,
      anchorPly: 4,
      san: "c5",
      uci: "c7c5",
    });
    assert.equal(branched.variations.length, 2);
    assert.equal(branched.activeId, "sicilienne");
    assert.equal(branched.variations[0]?.moves[0]?.san, "e4");
  });

  it("reopens an existing line instead of copying it", () => {
    const opened = follow("ligne");
    const again = followOnTrail(leaveTrail(opened), {
      id: "copie",
      rootFen: START,
      anchorPly: 4,
      moves: lineFromUci(START, PV),
    });
    assert.equal(again.variations.length, 1);
    assert.equal(again.activeId, "ligne");
    assert.equal(again.cursor, 1);
  });

  it("remembers the cursor when leaving and opening again", () => {
    const mid = stepTrail(follow("ligne"), 2);
    const back = leaveTrail(mid);
    assert.equal(back.activeId, null);
    assert.equal(back.variations[0]?.cursor, 3);
    const reopened = openVariation(back, "ligne");
    assert.equal(reopened.cursor, 3);
    assert.equal(variationLabel(reopened.variations[0]!), "e4 e5 Nf3 Nc6");
  });

  it("drops the oldest line past the cap and round-trips", () => {
    let trail = emptyTrail();
    const choices = new Chess(START).moves({ verbose: true }).slice(0, MAX_VARIATIONS + 1);

    for (let index = 0; index < choices.length; index += 1) {
      const move = choices[index];
      trail = playOnTrail(leaveTrail(trail), {
        id: `v${index}`,
        rootFen: START,
        anchorPly: 0,
        san: move.san,
        uci: `${move.from}${move.to}`,
      });
    }

    assert.equal(trail.variations.length, MAX_VARIATIONS);
    assert.equal(trail.variations.some((line) => line.id === "v0"), false);
    assert.deepEqual(parseTrail(JSON.parse(JSON.stringify(trail))), trail);
  });

  it("rejects a trail that cannot be played", () => {
    assert.equal(parseTrail(null), null);
    assert.equal(
      parseTrail({
        variations: [{ id: "x", rootFen: START, anchorPly: 0, cursor: 1, moves: [{ san: "e5", uci: "e2e4" }] }],
        activeId: "x",
        cursor: 1,
      }),
      null,
    );
  });

  it("is stored with an explicit save", () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
    };
    const trail = follow("ligne");
    const review: SavedReview = {
      id: "partie-1",
      savedAt: "2026-10-13T21:00:00.000Z",
      title: "Morphy – Allies",
      white: "Morphy",
      black: "Allies",
      result: "1-0",
      date: "1858.11.02",
      pgn: "1. e4 *",
      fen: null,
      depth: 12,
      ply: 4,
      viewer: "w",
      analyses: [],
      nodeEvals: [],
      trail,
    };

    upsertSaved(storage, review);
    assert.equal(readSaved(storage)[0]?.trail?.activeId, "ligne");
    assert.equal(readSaved(storage)[0]?.trail?.variations[0]?.moves.length, 4);
  });
});
