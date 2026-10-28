import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clearResume, readResume, writeResume, type ResumeSnapshot } from "./resume";

function memoryStorage() {
  const memory = new Map<string, string>();
  return {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
  };
}

const snapshot: ResumeSnapshot = {
  savedAt: "2026-10-12T21:00:00.000Z",
  pgn: '[White "Morphy"]\n\n1. e4 e5 *',
  fen: null,
  depth: 16,
  ply: 3,
  viewer: "w",
  orientation: "b",
  savedId: "partie-1",
  analyses: [
    null,
    {
      ply: 2,
      color: "b",
      classification: "mistake",
      cpLoss: 120,
      accuracy: 40,
      bestUci: "g8f6",
      bestSan: "Nf6",
      pvSan: "Nf6",
      before: { cp: 30, mate: null },
      after: { cp: 150, mate: null },
    },
  ],
  nodeEvals: [{ cp: 20, mate: null }, null],
};

describe("current game resume", () => {
  it("round-trips the open game, the ply and a partial analysis", () => {
    const storage = memoryStorage();
    writeResume(storage, snapshot);
    assert.deepEqual(readResume(storage), snapshot);
  });

  it("keeps a position without a pgn", () => {
    const storage = memoryStorage();
    const position: ResumeSnapshot = {
      ...snapshot,
      pgn: null,
      fen: "8/8/8/8/8/8/4k3/4K3 w - - 0 1",
      analyses: [],
      nodeEvals: [],
      savedId: null,
      viewer: null,
    };
    writeResume(storage, position);
    assert.equal(readResume(storage)?.fen, position.fen);
  });

  it("clears the open game without touching other keys", () => {
    const storage = memoryStorage();
    storage.setItem("pablo.revue.v1", "[]");
    writeResume(storage, snapshot);
    clearResume(storage);
    assert.equal(readResume(storage), null);
    assert.equal(storage.getItem("pablo.revue.v1"), "[]");
  });

  it("ignores corrupt or incomplete payloads", () => {
    const storage = memoryStorage();
    storage.setItem("pablo.revue.current.v1", "{not json");
    assert.equal(readResume(storage), null);
    storage.setItem("pablo.revue.current.v1", JSON.stringify({ pgn: "1. e4", ply: 1 }));
    assert.equal(readResume(storage), null);
    storage.setItem(
      "pablo.revue.current.v1",
      JSON.stringify({ ...snapshot, analyses: [{ ply: "nope" }] }),
    );
    assert.equal(readResume(storage), null);
    storage.setItem("pablo.revue.current.v1", JSON.stringify({ ...snapshot, pgn: null, fen: null }));
    assert.equal(readResume(storage), null);
  });

  it("keeps explored variations and ignores a trail that cannot be played", () => {
    const storage = memoryStorage();
    const trail = {
      variations: [
        {
          id: "ligne",
          rootFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
          anchorPly: 2,
          cursor: 1,
          moves: [
            { san: "e4", uci: "e2e4" },
            { san: "e5", uci: "e7e5" },
          ],
        },
      ],
      activeId: "ligne",
      cursor: 1,
    };
    writeResume(storage, { ...snapshot, trail });
    assert.equal(readResume(storage)?.trail?.variations[0]?.moves.length, 2);
    assert.equal(readResume(storage)?.trail?.cursor, 1);
    storage.setItem(
      "pablo.revue.current.v1",
      JSON.stringify({ ...snapshot, trail: { variations: [{ id: "nope" }], activeId: null, cursor: 0 } }),
    );
    const resumed = readResume(storage);
    assert.equal(resumed?.pgn, snapshot.pgn);
    assert.equal(resumed?.trail, undefined);
  });
});
