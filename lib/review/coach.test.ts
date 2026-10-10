import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Chess } from "chess.js";
import { analyzeGame } from "./analyze-game";
import { explainMove, type ExplainInput } from "./explain";
import { forkTargets, loadChess, playUci, skewer, type Motif } from "./motifs";
import { parsePgn } from "./parse";
import { SAMPLE_PGN } from "./sample";
import { buildCoachingSession, phaseAt, recognizeOpening } from "./session";
import type { MoveAnalysis, MoveClass, NodeEval, Side } from "./types";

const CLAIM: Array<[string, RegExp]> = [
  ["fourchette", /fourchette/],
  ["clouage", /clou/],
  ["enfilade", /enfilade/],
  ["echec-decouvert", /découvert/],
  ["echec-double", /échec double/],
  ["piece-en-prise", /en prise/],
  ["coup-intermediaire", /intermédiaire/],
  ["promotion", /promotion/],
  ["mat", /mat en|avais mat|autorise un mat|annonce mat/],
];

function explain(partial: Partial<ExplainInput> & Pick<ExplainInput, "fenBefore" | "playedUci" | "playedSan">) {
  const result = explainMove({
    bestUci: null,
    bestSan: null,
    pvUci: [],
    pvSan: "",
    before: { cp: 20, mate: null },
    after: { cp: -180, mate: null },
    color: "w",
    phase: "milieu",
    ...partial,
  });

  for (const [motif, pattern] of CLAIM) {
    if (pattern.test(result.text)) {
      assert.ok(result.motifs.includes(motif as Motif), result.text);
    }
  }

  return result;
}

function row(partial: Partial<MoveAnalysis> & { color: Side; classification: MoveClass; cpLoss: number }): MoveAnalysis {
  const before: NodeEval = partial.before ?? { cp: 0, mate: null };
  const after: NodeEval = partial.after ?? { cp: 0, mate: null };
  return {
    ply: partial.ply ?? 1,
    color: partial.color,
    classification: partial.classification,
    cpLoss: partial.cpLoss,
    accuracy: partial.accuracy ?? 40,
    bestUci: partial.bestUci ?? null,
    bestSan: partial.bestSan ?? null,
    pvSan: partial.pvSan ?? "",
    pvUci: partial.pvUci ?? [],
    before,
    after,
  };
}

describe("motifs on real positions", () => {
  it("names the knight fork on the king and the rook", () => {
    const fen = "8/6k1/3r4/8/8/6N1/8/4K3 w - - 0 1";
    const board = loadChess(fen);
    assert.ok(board);
    const played = playUci(board, "g3f5");
    assert.ok(played);
    const targets = forkTargets(board, "f5");
    assert.deepEqual(
      targets.map((target) => target.square).sort(),
      ["d6", "g7"],
    );

    const result = explain({
      fenBefore: fen,
      playedSan: "Ke2",
      playedUci: "e1e2",
      bestSan: "Nf5",
      bestUci: "g3f5",
      pvUci: ["g3f5"],
      pvSan: "Nf5",
      before: { cp: 80, mate: null },
      after: { cp: -220, mate: null },
    });

    assert.ok(result.motifs.includes("fourchette"));
    assert.match(result.text, /fourchette/);
    assert.match(result.text, /roi/);
    assert.match(result.text, /tour/);
    assert.equal(result.motifs.includes("clouage"), false);
    assert.equal(result.motifs.includes("mat"), false);
  });

  it("sees the pin in the Opera Game when the knight steps off the queen", () => {
    const game = parsePgn("1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. Nxe5 Bxd1 *");
    const move = game.moves.find((item) => item.san === "Nxe5");
    assert.ok(move);

    const result = explain({
      fenBefore: move.fenBefore,
      playedSan: move.san,
      playedUci: move.uci,
      color: "w",
      bestSan: "dxe5",
      bestUci: "d4e5",
      pvUci: ["d4e5"],
      pvSan: "dxe5",
      before: { cp: 30, mate: null },
      after: { cp: -700, mate: null },
      phase: "ouverture",
    });

    assert.ok(result.motifs.includes("clouage"), result.text);
    assert.match(result.text, /dame/);
    assert.equal(result.motifs.includes("fourchette"), false);
  });

  it("calls an undefended knight en prise", () => {
    const fen = "4k3/8/8/8/8/8/4n3/4K2R w - - 0 1";
    const result = explain({
      fenBefore: fen,
      playedSan: "Rh2",
      playedUci: "h1h2",
      bestSan: "Kxe2",
      bestUci: "e1e2",
      pvUci: ["e1e2"],
      pvSan: "Kxe2",
    });

    assert.ok(result.motifs.includes("piece-en-prise"), result.text);
    assert.match(result.text, /cavalier en e2/);
    assert.match(result.text, /en prise/);
    assert.equal(result.motifs.includes("fourchette"), false);
  });

  it("names the missed promotion", () => {
    const result = explain({
      fenBefore: "8/P3k3/8/8/8/8/4K3/8 w - - 0 1",
      playedSan: "Ke3",
      playedUci: "e2e3",
      bestSan: "a8=Q",
      bestUci: "a7a8q",
      pvUci: ["a7a8q"],
      pvSan: "a8=Q",
      before: { cp: 900, mate: null },
      after: { cp: 200, mate: null },
      phase: "finale",
    });

    assert.ok(result.motifs.includes("promotion"), result.text);
    assert.ok(result.motifs.includes("finale"));
    assert.match(result.text, /En finale/);
    assert.match(result.text, /promotion/);
    assert.equal(result.motifs.includes("fourchette"), false);
  });

  it("proves the scholar's mate instead of inventing a longer net", () => {
    const game = parsePgn("1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#");
    const blunder = game.moves.find((move) => move.san === "Nf6");
    assert.ok(blunder);

    const allowed = explain({
      fenBefore: blunder.fenBefore,
      playedSan: blunder.san,
      playedUci: blunder.uci,
      color: "b",
      bestSan: "g6",
      bestUci: "g7g6",
      pvUci: ["g7g6"],
      pvSan: "g6",
      before: { cp: 40, mate: null },
      after: { cp: 99_999, mate: 1 },
    });

    assert.ok(allowed.motifs.includes("mat"), allowed.text);
    assert.match(allowed.text, /mat en 1/);
    assert.match(allowed.text, /Qxf7#/);
    assert.equal(allowed.motifs.includes("fourchette"), false);

    const missed = explain({
      fenBefore: blunder.fenAfter,
      playedSan: "a3",
      playedUci: "a2a3",
      bestSan: "Qxf7#",
      bestUci: "h5f7",
      pvUci: ["h5f7"],
      pvSan: "Qxf7#",
      before: { cp: 99_999, mate: 1 },
      after: { cp: 400, mate: null },
    });

    assert.match(missed.text, /mat en 1/);
    assert.match(missed.text, /Qxf7#/);
  });

  it("names the skewer and not a fork", () => {
    const fen = "8/8/8/8/q3k3/8/8/4K2R w - - 0 1";
    const board = loadChess(fen);
    assert.ok(board);
    assert.ok(playUci(board, "h1h4"));
    assert.ok(skewer(board, "h4"));

    const result = explain({
      fenBefore: fen,
      playedSan: "Ke2",
      playedUci: "e1e2",
      bestSan: "Rh4+",
      bestUci: "h1h4",
      pvUci: ["h1h4"],
      pvSan: "Rh4+",
    });

    assert.ok(result.motifs.includes("enfilade"), result.text);
    assert.equal(result.motifs.includes("fourchette"), false);
    assert.match(result.text, /dame/);
  });

  it("names a discovered check and a double check", () => {
    const discovered = explain({
      fenBefore: "4k3/8/8/8/8/8/4B3/4R1K1 w - - 0 1",
      playedSan: "Kh1",
      playedUci: "g1h1",
      bestSan: "Bc4+",
      bestUci: "e2c4",
      pvUci: ["e2c4"],
      pvSan: "Bc4+",
    });
    assert.ok(discovered.motifs.includes("echec-decouvert"), discovered.text);
    assert.match(discovered.text, /découvert/);

    const double = explain({
      fenBefore: "4k3/8/8/8/8/8/4B3/4R1K1 w - - 0 1",
      playedSan: "Kh1",
      playedUci: "g1h1",
      bestSan: "Bb5+",
      bestUci: "e2b5",
      pvUci: ["e2b5"],
      pvSan: "Bb5+",
    });
    assert.ok(double.motifs.includes("echec-double"), double.text);
    assert.match(double.text, /échec double/);
  });

  it("calls the check before the capture a zwischenzug", () => {
    const fen = "4k3/r7/8/8/Q7/8/5B2/4K3 w - - 0 1";
    const chess = new Chess(fen);
    const check = chess.move("Qe4+");
    assert.ok(check);
    const reply = chess.moves({ verbose: true }).find((move) => move.san === "Kd8" || move.san === "Kf8");
    assert.ok(reply);
    chess.move(reply);
    const take = chess.move("Bxa7");
    assert.ok(take);

    const result = explain({
      fenBefore: fen,
      playedSan: "Ke2",
      playedUci: "e1e2",
      bestSan: "Qe4+",
      bestUci: "a4e4",
      pvUci: ["a4e4", `${reply.from}${reply.to}`, "f2a7"],
      pvSan: `Qe4+ ${reply.san} Bxa7`,
      before: { cp: 200, mate: null },
      after: { cp: -100, mate: null },
    });

    assert.ok(result.motifs.includes("coup-intermediaire"), result.text);
    assert.match(result.text, /intermédiaire/);
    assert.match(result.text, /échec/);
    assert.equal(result.motifs.includes("fourchette"), false);
  });

  it("does not invent a tactic for a quiet developing miss", () => {
    const result = explain({
      fenBefore: new Chess().fen(),
      playedSan: "a3",
      playedUci: "a2a3",
      bestSan: "e4",
      bestUci: "e2e4",
      pvUci: ["e2e4", "e7e5"],
      pvSan: "e4 e5",
      before: { cp: 20, mate: null },
      after: { cp: 10, mate: null },
      phase: "ouverture",
    });

    assert.deepEqual(result.motifs, []);
    assert.match(result.text, /e4/);
    assert.match(result.text, /centre/);
    assert.doesNotMatch(result.text, /fourchette|clou|enfilade|en prise|intermédiaire|promotion|mat en/i);
  });

  it("talks about a hung pawn as an endgame, with the piece actually loose", () => {
    const result = explain({
      fenBefore: "8/8/8/4k3/4P3/4K3/8/8 w - - 0 1",
      playedSan: "Kd2",
      playedUci: "e3d2",
      bestSan: "Kf3",
      bestUci: "e3f3",
      pvUci: ["e3f3"],
      pvSan: "Kf3",
      before: { cp: 80, mate: null },
      after: { cp: -120, mate: null },
      phase: "finale",
    });

    assert.ok(result.motifs.includes("piece-en-prise"), result.text);
    assert.ok(result.motifs.includes("finale"));
    assert.match(result.text, /pion en e4/);
    assert.match(result.text, /En finale/);
  });
});

describe("opening phase and the three lessons", () => {
  it("names the Giuoco Piano and the move that leaves the catalog", () => {
    const game = parsePgn("1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. a3 *");
    const opening = recognizeOpening(game.moves, "");

    assert.equal(opening.source, "catalog");
    assert.equal(opening.name, "Partie italienne");
    assert.equal(opening.variation, "Giuoco Piano");
    assert.equal(opening.exitLabel, "5... exd4");
    assert.equal(phaseAt(game.moves, 0, opening.exitPly), "ouverture");
    assert.notEqual(phaseAt(game.moves, opening.exitPly ?? 0, opening.exitPly), "ouverture");
  });

  it("names the Najdorf English Attack from the move order", () => {
    const game = parsePgn(
      "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be3 e5 7. Nb3 Be6 8. f3 Be7 *",
    );
    const opening = recognizeOpening(game.moves, "Sicilian Defense");

    assert.equal(opening.name, "Sicilienne Najdorf");
    assert.equal(opening.variation, "English Attack");
    assert.equal(opening.exitLabel, "8... Be7");
  });

  it("reads the Berlin castling line from the catalog", () => {
    const game = parsePgn("1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6 4. O-O Nxe4 5. d4 *");
    const opening = recognizeOpening(game.moves, "");

    assert.equal(opening.name, "Partie espagnole");
    assert.equal(opening.variation, "Berlin Defense");
    assert.equal(opening.exitPly, null);
  });

  it("keeps the Philidor header of the sample game and finds an exit", () => {
    const game = parsePgn(SAMPLE_PGN);
    const opening = recognizeOpening(game.moves, game.opening);

    assert.equal(opening.source, "header");
    assert.match(opening.name, /Philidor/);
    assert.ok(opening.exitPly && opening.exitPly >= 8 && opening.exitPly <= 24, String(opening.exitPly));
    assert.equal(phaseAt(game.moves, 0, opening.exitPly), "ouverture");
    assert.notEqual(phaseAt(game.moves, game.moves.length, opening.exitPly), "ouverture");
  });

  it("builds three lessons and three clickable moments from the scholar game", () => {
    const game = parsePgn("1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#");
    const analyses = game.moves.map((move) =>
      row({
        ply: move.ply,
        color: move.color,
        classification: move.san === "Nf6" ? "blunder" : "best",
        cpLoss: move.san === "Nf6" ? 800 : move.san === "e5" ? 30 : 0,
        bestUci: move.san === "Nf6" ? "g7g6" : move.uci,
        bestSan: move.san === "Nf6" ? "g6" : move.san,
        pvUci: move.san === "Nf6" ? ["g7g6"] : [move.uci],
        pvSan: move.san === "Nf6" ? "g6" : move.san,
        before: { cp: move.san === "Nf6" ? 40 : 20, mate: null },
        after: move.san === "Nf6" ? { cp: 99_999, mate: 1 } : { cp: 20, mate: null },
      }),
    );

    const session = buildCoachingSession({
      moves: game.moves,
      analyses,
      openingHeader: "",
      result: "1-0",
      viewer: "b",
    });

    assert.equal(session.lessons.length, 3);
    assert.equal(session.keyMoments.length, 3);
    assert.equal(session.keyMoments[0]?.label, "3... Nf6");
    assert.match(session.lessons[0]?.text ?? "", /Nf6/);
    assert.match(session.lessons[0]?.text ?? "", /mat en 1/);
    assert.match(session.lessons.map((lesson) => lesson.title).join(" "), /Moment critique/);
    assert.match(session.lessons[1]?.text ?? "", /ouverture|milieu|finale/);
    const note = session.notes[game.moves.findIndex((move) => move.san === "Nf6")];
    assert.match(note?.text ?? "", /Qxf7#/);
  });

  it("stores the principal variation on each analyzed move", async () => {
    const game = parsePgn("1. e4 e5 *");
    const result = await analyzeGame({
      startFen: game.startFen,
      moves: game.moves,
      search: async () => ({ bestUci: "e2e4", cp: 20, mate: null, pvUci: ["e2e4", "e7e5"] }),
    });

    assert.deepEqual(result.analyses[0]?.pvUci, ["e2e4", "e7e5"]);
  });
});
