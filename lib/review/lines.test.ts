import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adjacentWeakPly,
  centipawnGap,
  classGlyph,
  describeSpread,
  formatLineGap,
  isWeakMove,
  lineSpread,
  verdictOf,
} from "./lines";

describe("weak-move navigation", () => {
  const rows = [
    { classification: "best" as const },
    null,
    { classification: "inaccuracy" as const },
    { classification: "good" as const },
    { classification: "blunder" as const },
  ];

  it("marks only the three weak classes", () => {
    assert.equal(classGlyph("blunder"), "??");
    assert.equal(classGlyph("mistake"), "?");
    assert.equal(classGlyph("inaccuracy"), "?!");
    assert.equal(classGlyph("best"), "");
    assert.equal(classGlyph("ok"), "");
    assert.equal(isWeakMove("mistake"), true);
    assert.equal(isWeakMove("good"), false);
  });

  it("jumps to the next or previous classified weakness and skips holes", () => {
    assert.equal(adjacentWeakPly(rows, 0, 1), 3);
    assert.equal(adjacentWeakPly(rows, 3, 1), 5);
    assert.equal(adjacentWeakPly(rows, 5, 1), null);
    assert.equal(adjacentWeakPly(rows, 5, -1), 3);
    assert.equal(adjacentWeakPly(rows, 4, -1), 3);
    assert.equal(adjacentWeakPly(rows, 1, -1), null);
  });
});

describe("engine line spread", () => {
  it("calls a one-pawn swing from equality a single move", () => {
    const spread = lineSpread({ cp: 20, mate: null }, { cp: -80, mate: null }, "w");
    assert.ok(spread);
    assert.equal(verdictOf(spread).kind, "only");
    assert.match(describeSpread({ cp: 20, mate: null }, { cp: -80, mate: null }, "w") ?? "", /Un seul coup tient · écart 1\.00/);
  });

  it("treats a small gap as several playable moves", () => {
    assert.equal(
      describeSpread({ cp: 12, mate: null }, { cp: -8, mate: null }, "w"),
      "Plusieurs coups jouables · écart 0.20",
    );
  });

  it("does not call two winning mates a single move", () => {
    assert.equal(
      describeSpread({ cp: null, mate: 1 }, { cp: null, mate: 4 }, "w"),
      "Plusieurs mats",
    );
  });

  it("treats a mating move against a pawn eval as the only move", () => {
    assert.match(
      describeSpread({ cp: null, mate: 1 }, { cp: 30, mate: null }, "w") ?? "",
      /^Un seul coup tient · écart mat$/,
    );
  });

  it("keeps a pawn of difference in a won position from looking unique", () => {
    const spread = lineSpread({ cp: 800, mate: null }, { cp: 700, mate: null }, "w");
    assert.ok(spread);
    assert.notEqual(verdictOf(spread).kind, "only");
  });

  it("hides the verdict while the second line still outranks the first", () => {
    assert.equal(lineSpread({ cp: 0, mate: null }, { cp: 80, mate: null }, "w"), null);
    assert.equal(describeSpread({ cp: 0, mate: null }, { cp: 40, mate: null }, "b"), null);
  });

  it("measures the gap from the side to move", () => {
    assert.equal(centipawnGap({ cp: 40, mate: null }, { cp: -25, mate: null }, "b"), 65);
    assert.equal(formatLineGap(65), "0.65");
    assert.equal(formatLineGap(12_000), "mat");
  });
});
