import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatEta, remainingMillis } from "./eta";

describe("analysis duration", () => {
  it("waits for the first finished position", () => {
    assert.equal(remainingMillis({ done: 0, total: 41, elapsedMs: 0 }), null);
    assert.equal(formatEta(null), null);
  });

  it("projects the measured pace onto the rest of a long game", () => {
    const remaining = remainingMillis({ done: 4, total: 41, elapsedMs: 20_000 });
    assert.equal(remaining, 185_000);
    assert.equal(formatEta(remaining), "encore ~3 min");
  });

  it("uses seconds while the wait is under a minute", () => {
    const remaining = remainingMillis({ done: 10, total: 20, elapsedMs: 15_000 });
    assert.equal(remaining, 15_000);
    assert.equal(formatEta(remaining), "encore ~15 s");
  });

  it("says nothing once the scan is finished", () => {
    assert.equal(remainingMillis({ done: 20, total: 20, elapsedMs: 40_000 }), 0);
    assert.equal(formatEta(0), null);
  });
});
