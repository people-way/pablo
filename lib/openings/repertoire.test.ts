import assert from "node:assert/strict";
import test from "node:test";
import { findFirstInaccuracy } from "@/lib/openings/probe";
import { buildRepertoire, type RepertoireGame } from "@/lib/openings/repertoire";
import { toAnalysisSaveResult } from "@/lib/openings/save-payload";

function game(input: {
  moves: string;
  color: "white" | "black";
  result: "win" | "loss" | "draw";
  resultHeader: "1-0" | "0-1" | "1/2-1/2";
  eco?: string;
  url?: string;
  timeClass?: string;
  accuracy?: number;
  date?: string;
}): RepertoireGame {
  const white = input.color === "white" ? "HugoBoure" : "Adversaire";
  const black = input.color === "black" ? "HugoBoure" : "Adversaire";
  return {
    pgn: [
      '[Event "Live Chess"]',
      '[Site "Chess.com"]',
      `[Date "${(input.date ?? "2026-10-01").slice(0, 10).replaceAll("-", ".")}"]`,
      `[White "${white}"]`,
      `[Black "${black}"]`,
      `[Result "${input.resultHeader}"]`,
      `[ECO "${input.eco ?? "C50"}"]`,
      "",
      `${input.moves} ${input.resultHeader}`,
    ].join("\n"),
    color: input.color,
    result: input.result,
    date: input.date ?? "2026-10-01T18:00:00.000Z",
    accuracy: input.accuracy ?? null,
    timeClass: input.timeClass ?? "rapid",
    rules: "chess",
    url: input.url ?? null,
    playerRating: 1980,
  };
}

const ITALIAN_H6 = "1. e4 e5 2. Nf3 Nc6 3. Bc4 h6 4. d3 d6";
const FRENCH = "1. e4 e6 2. d4 d5 3. Nc3 Nf6 4. e5 Nfd7";

test("names the Italian in French and tells Black to play Bc5 instead of h6", () => {
  const games = [
    game({ moves: ITALIAN_H6, color: "black", result: "loss", resultHeader: "1-0", accuracy: 62, url: "https://www.chess.com/game/1" }),
    game({ moves: ITALIAN_H6, color: "black", result: "loss", resultHeader: "1-0", accuracy: 70 }),
    game({ moves: ITALIAN_H6, color: "black", result: "loss", resultHeader: "1-0", accuracy: 58 }),
    game({ moves: FRENCH, color: "black", result: "win", resultHeader: "0-1", eco: "C11" }),
    game({ moves: FRENCH, color: "black", result: "win", resultHeader: "0-1", eco: "C11" }),
    game({ moves: FRENCH, color: "black", result: "win", resultHeader: "0-1", eco: "C11" }),
    game({ moves: FRENCH, color: "black", result: "draw", resultHeader: "1/2-1/2", eco: "C11" }),
  ];

  const report = buildRepertoire(games, {
    username: "HugoBoure",
    months: 9,
    archives: ["2026/02", "2026/10"],
  });

  assert.equal(report.gameCount, 7);
  assert.equal(report.colors.black.stats.games, 7);
  assert.equal(report.periodLabel, "février 2026 – octobre 2026");

  const italian = report.weaknesses.find((item) => item.openingName === "Partie italienne");
  assert.ok(italian, report.weaknesses.map((item) => item.openingName).join(", "));
  assert.equal(italian.color, "black");
  assert.equal(italian.playedSan, "h6");
  assert.equal(italian.insteadSan, "Bc5");
  assert.equal(italian.kind, "early-exit");
  assert.match(italian.diagnosis, /Partie italienne/);
  assert.match(italian.whatToPlay, /Bc5/);
  assert.match(italian.whatToPlay, /h6/);
  assert.match(italian.idea, /Bc4|centre|Nf6/);
  assert.equal(italian.stats.games, 3);
  assert.equal(italian.stats.scorePct, 0);
  assert.equal(italian.stats.avgAccuracy, 63.3);
  assert.equal(italian.drill.quizSan, "Bc5");
  assert.equal(italian.drill.orientation, "b");
  assert.equal(italian.sampleUrl, "https://www.chess.com/game/1");

  const family = report.families.find((item) => item.opening.startsWith("Défense française"));
  assert.ok(family);
  assert.equal(family.color, "black");
  assert.equal(family.gameCount, 4);
  assert.ok(family.scorePct >= 58);
  assert.ok(report.anchors.some((anchor) => anchor.openingName.startsWith("Défense française")));
  assert.match(report.summary, /HugoBoure/);
  assert.match(report.summary, /Partie italienne/);
  assert.match(report.summary, /Défense française/);

  const save = toAnalysisSaveResult(report);
  assert.ok(save.openings.every((opening) => opening.opening.length <= 120));
  assert.ok(save.openings.some((opening) => opening.opening.startsWith("Partie italienne") && opening.color === "black"));
  assert.equal(save.winRate, report.winRate);
});

test("ignores bullets and games that never leave the first moves", () => {
  const report = buildRepertoire(
    [
      game({ moves: "1. e4 e5", color: "white", result: "loss", resultHeader: "0-1" }),
      game({ moves: ITALIAN_H6, color: "white", result: "loss", resultHeader: "0-1", timeClass: "bullet" }),
      game({ moves: ITALIAN_H6, color: "white", result: "win", resultHeader: "1-0" }),
    ],
    { username: "HugoBoure", skippedBullet: 0 },
  );

  assert.equal(report.gameCount, 1);
  assert.equal(report.skippedShort, 1);
  assert.equal(report.skippedBullet, 1);
  assert.equal(report.colors.white.stats.wins, 1);
});

test("flags an opponent reply that keeps costing points", () => {
  const slow = "1. e4 e5 2. Nf3 Nc6 3. Bc4 h6 4. Nc3 Nf6";
  const games = [0, 1, 2].map(() =>
    game({ moves: slow, color: "white", result: "loss", resultHeader: "0-1" }),
  );
  const report = buildRepertoire(games, { username: "HugoBoure" });
  const reply = report.weaknesses.find((item) => item.playedSan === "h6");

  assert.ok(reply);
  assert.equal(reply.playedByUser, false);
  assert.equal(reply.kind, "opponent-reply");
  assert.equal(reply.openingName, "Partie italienne");
  assert.match(reply.diagnosis, /réponse qui te gêne/i);
  assert.equal(reply.drill.orientation, "w");
});

test("stops the engine probe at the first real inaccuracy", async () => {
  const hit = await findFirstInaccuracy({
    sans: ["e4", "e5", "Qh5"],
    user: "w",
    search: async (fen) => {
      const side = fen.split(" ")[1];
      if (side === "w" && fen.startsWith("rnbqkbnr/pppppppp")) {
        return { bestUci: "e2e4", whiteEval: { cp: 20, mate: null } };
      }
      if (side === "w") {
        return { bestUci: "g1f3", whiteEval: { cp: 30, mate: null } };
      }
      return { bestUci: "e7e5", whiteEval: { cp: -120, mate: null } };
    },
  });

  assert.ok(hit);
  assert.equal(hit.ply, 3);
  assert.equal(hit.playedSan, "Qh5");
  assert.equal(hit.bestSan, "Nf3");
  assert.ok(hit.cpLoss > 40);
  assert.ok(["inaccuracy", "mistake", "blunder"].includes(hit.classification));
});
