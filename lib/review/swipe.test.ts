import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { swipeDirection } from "./swipe";

describe("move swipe", () => {
  it("advances when the finger moves left and goes back when it moves right", () => {
    assert.equal(swipeDirection(-80, 10), 1);
    assert.equal(swipeDirection(80, -4), -1);
  });

  it("ignores taps and vertical scrolls", () => {
    assert.equal(swipeDirection(12, 4), null);
    assert.equal(swipeDirection(-20, 70), null);
    assert.equal(swipeDirection(30, 40), null);
  });
});
