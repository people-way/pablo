import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyzeGame } from "./analyze-game";
import { assessMove, classifyCentipawnLoss, summarizePlayer, summaryText } from "./classify";
import { parseFen, parsePgn } from "./parse";
import { SAMPLE_PGN } from "./sample";
import { accuracyFromWinLoss, formatCentipawnLoss, moveAccuracy, winPercent } from "./scores";
import { readSaved, removeSaved, upsertSaved } from "./storage";
import { parseBestMove, parseInfoLine } from "./uci";

describe("classification", () => {
  it("uses the usual centipawn bands", () => {
    assert.equal(classifyCentipawnLoss(0), "good");
    assert.equal(classifyCentipawnLoss(20), "good");
    assert.equal(classifyCentipawnLoss(21), "ok");
    assert.equal(classifyCentipawnLoss(49), "ok");
    assert.equal(classifyCentipawnLoss(50), "inaccuracy");
    assert.equal(classifyCentipawnLoss(99), "inaccuracy");
    assert.equal(classifyCentipawnLoss(100), "mistake");
    assert.equal(classifyCentipawnLoss(199), "mistake");
    assert.equal(classifyCentipawnLoss(200), "blunder");
    assert.equal(classifyCentipawnLoss(800), "blunder");
  });

  it("treats the engine move as best even if the next search drifts", () => {
    const assessed = assessMove({
      color: "w",
      playedUci: "e2e4",
      bestUci: "e2e4",
      before: { cp: 30, mate: null },
      after: { cp: -80, mate: null },
    });

    assert.deepEqual(assessed, { classification: "best", cpLoss: 0, accuracy: 100 });
  });

  it("marks a 150 centipawn swing as a mistake", () => {
    const assessed = assessMove({
      color: "b",
      playedUci: "f7f6",
      bestUci: "e7e5",
      before: { cp: 20, mate: null },
      after: { cp: 170, mate: null },
    });

    assert.equal(assessed.classification, "mistake");
    assert.equal(assessed.cpLoss, 150);
    assert.ok(assessed.accuracy < 80);
  });

  it("scores a zero-loss move at 100 and a collapse much lower", () => {
    assert.equal(Number(accuracyFromWinLoss(0).toFixed(1)), 100);
    assert.ok(accuracyFromWinLoss(30) < 40);
    const accurate = moveAccuracy({ cp: 0, mate: null }, { cp: 0, mate: null }, "w");
    assert.equal(Number(accurate.toFixed(1)), 100);
    assert.equal(formatCentipawnLoss(150), "-1.50");
    assert.equal(formatCentipawnLoss(100_000), "mat");
    assert.ok(winPercent(0) === 50);
    assert.ok(winPercent(400) > 80);
  });

  it("summarizes each player in French", () => {
    const summary = summarizePlayer(
      [
        { color: "w", classification: "blunder", cpLoss: 300, accuracy: 20 },
        { color: "w", classification: "inaccuracy", cpLoss: 60, accuracy: 80 },
        { color: "b", classification: "best", cpLoss: 0, accuracy: 100 },
      ],
      "w",
    );

    assert.equal(summary.blunders, 1);
    assert.equal(summary.inaccuracies, 1);
    assert.equal(summary.moves, 2);
    assert.match(summaryText(summary), /Blanc — précision 50 % · 1 gaffe · 0 erreurs · 1 imprécision/);
  });
});

describe("PGN and FEN", () => {
  it("parses the sample game through to mate", () => {
    const game = parsePgn(SAMPLE_PGN);

    assert.equal(game.white, "Morphy");
    assert.equal(game.black, "Allies");
    assert.equal(game.result, "1-0");
    assert.equal(game.opening, "Philidor");
    assert.equal(game.moves.length, 33);
    assert.equal(game.moves[0].san, "e4");
    assert.equal(game.moves[0].uci, "e2e4");
    assert.equal(game.moves[0].color, "w");
    assert.equal(game.moves.at(-1)?.san, "Rd8#");
    assert.equal(game.startFen, game.moves[0].fenBefore);
  });

  it("rejects an empty or broken PGN", () => {
    assert.throws(() => parsePgn("   "), /PGN/);
    assert.throws(() => parsePgn("1. e4 e5 2. Qh5 Ke7 3. not-a-move"), /PGN/);
  });

  it("normalizes a valid FEN and rejects garbage", () => {
    const fen = parseFen("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1");
    assert.match(fen, /^rnbqkbnr\/pppppppp\/8\/8\/4P3\/8\/PPPP1PPP\/RNBQKBNR b KQkq/);
    assert.throws(() => parseFen("ceci n'est pas une fen"), /FEN/);
    assert.throws(() => parseFen(""), /FEN/);
  });

  it("keeps a clock comment and still reads the moves", () => {
    const game = parsePgn(`[White "Hugo"]
[Black "N"]
[Result "*"]

1. e4 {[%clk 0:05:00]} e5 2. Nf3 Nc6 *`);

    assert.equal(game.white, "Hugo");
    assert.equal(game.moves.map((move) => move.san).join(" "), "e4 e5 Nf3 Nc6");
  });
});

describe("UCI lines", () => {
  it("reads multipv scores and ignores bound lines", () => {
    const line = parseInfoLine(
      "info depth 12 seldepth 18 multipv 2 score cp -34 nodes 1000 pv e7e5 g1f3",
    );

    assert.deepEqual(line, {
      depth: 12,
      multipv: 2,
      cp: -34,
      mate: null,
      pvUci: ["e7e5", "g1f3"],
    });

    assert.equal(
      parseInfoLine("info depth 10 score cp 12 upperbound pv d2d4"),
      null,
    );

    const mate = parseInfoLine("info depth 8 score mate -3 pv h7h8q");
    assert.equal(mate?.mate, -3);
    assert.equal(mate?.cp, null);
  });

  it("reads bestmove and the none token", () => {
    assert.equal(parseBestMove("bestmove e2e4 ponder e7e5"), "e2e4");
    assert.equal(parseBestMove("bestmove (none)"), null);
    assert.equal(parseBestMove("info depth 1"), undefined);
  });
});

describe("game analysis with a fake engine", () => {
  it("classifies a hung queen as a blunder and skips a mated position", () => {
    const game = parsePgn("1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#");
    const searched: string[] = [];
    const script = new Map<string, { bestUci: string; cp: number }>();

    for (const move of game.moves) {
      script.set(move.fenBefore, { bestUci: move.uci, cp: 20 });
    }

    const blunder = game.moves.find((move) => move.san === "Nf6");
    assert.ok(blunder);
    script.set(blunder.fenBefore, { bestUci: "d7d6", cp: 40 });
    script.set(blunder.fenAfter, { bestUci: "h5f7", cp: 800 });

    return analyzeGame({
      startFen: game.startFen,
      moves: game.moves,
      search: async (fen) => {
        searched.push(fen);
        const row = script.get(fen) ?? { bestUci: "a2a3", cp: 10 };
        return { bestUci: row.bestUci, cp: row.cp, mate: null, pvUci: [row.bestUci] };
      },
    }).then((result) => {
      const mateFen = game.moves.at(-1)?.fenAfter;
      assert.ok(mateFen);
      assert.equal(searched.includes(mateFen), false);

      const nf6 = result.analyses[game.moves.findIndex((move) => move.san === "Nf6")];
      assert.equal(nf6?.classification, "blunder");
      assert.ok((nf6?.cpLoss ?? 0) >= 200);

      const e4 = result.analyses[0];
      assert.equal(e4?.classification, "best");
      assert.equal(e4?.bestSan, "e4");
    });
  });
});

describe("local saves", () => {
  it("stores, reopens and deletes a review", () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
    };
    const review = {
      id: "partie-1",
      savedAt: "2026-10-07T12:00:00.000Z",
      title: "Morphy – Allies",
      white: "Morphy",
      black: "Allies",
      result: "1-0",
      date: "1858.11.02",
      pgn: SAMPLE_PGN,
      fen: null,
      depth: 10,
      ply: 4,
      viewer: "w" as const,
      analyses: [],
      nodeEvals: [],
    };

    upsertSaved(storage, review);
    assert.equal(readSaved(storage)[0]?.title, "Morphy – Allies");
    upsertSaved(storage, { ...review, ply: 8 });
    assert.equal(readSaved(storage).length, 1);
    assert.equal(readSaved(storage)[0]?.ply, 8);
    removeSaved(storage, "partie-1");
    assert.deepEqual(readSaved(storage), []);
  });

  it("ignores corrupt storage", () => {
    const storage = { getItem: () => "{not json" };
    assert.deepEqual(readSaved(storage), []);
    assert.deepEqual(readSaved({ getItem: () => "[]" }), []);
    assert.deepEqual(readSaved({ getItem: () => "{\"no\":1}" }), []);
  });
});
