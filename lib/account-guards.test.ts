import assert from "node:assert/strict";
import test from "node:test";
import { normalizeChessComUsername, safeRedirectPath } from "./account-guards";
import { prepareAnalysisSave } from "./analysis-save";
import { accountsConfigured } from "./supabase/env";

test("safeRedirectPath keeps in-app paths", () => {
  assert.equal(safeRedirectPath("/dashboard"), "/dashboard");
  assert.equal(
    safeRedirectPath("/analyze?username=ada"),
    "/analyze?username=ada",
  );
  assert.equal(safeRedirectPath("  /revue  "), "/revue");
});

test("safeRedirectPath blocks open redirects", () => {
  assert.equal(safeRedirectPath("https://evil.example"), "/dashboard");
  assert.equal(safeRedirectPath("//evil.example"), "/dashboard");
  assert.equal(safeRedirectPath("/\\evil"), "/dashboard");
  assert.equal(safeRedirectPath("/%2f%2fevil.example"), "/dashboard");
  assert.equal(safeRedirectPath("javascript:alert(1)"), "/dashboard");
  assert.equal(safeRedirectPath(null), "/dashboard");
});

test("normalizeChessComUsername accepts Chess.com handles", () => {
  assert.equal(normalizeChessComUsername(" Hikaru "), "Hikaru");
  assert.equal(normalizeChessComUsername("ab"), null);
  assert.equal(normalizeChessComUsername("bad name"), null);
  assert.equal(normalizeChessComUsername("pablo-sample"), "pablo-sample");
});

test("accountsConfigured requires both Supabase variables", () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  assert.equal(accountsConfigured(), false);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  assert.equal(accountsConfigured(), false);
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
  assert.equal(accountsConfigured(), true);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "not-a-url";
  assert.equal(accountsConfigured(), false);

  if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
  if (previousKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = previousKey;
});

test("prepareAnalysisSave rejects the sample and keeps real openings", () => {
  const sample = prepareAnalysisSave({
    chessUsername: "pablo-sample",
    result: {
      username: "pablo-sample",
      gameCount: 4,
      wins: 1,
      losses: 3,
      draws: 0,
      winRate: 25,
      summary: "sample",
      openings: [],
    },
  });
  assert.equal(sample.ok, false);

  const flagged = prepareAnalysisSave({
    sample: true,
    chessUsername: "Hikaru",
    result: {
      gameCount: 4,
      wins: 1,
      losses: 3,
      draws: 0,
      winRate: 25,
      summary: "real",
    },
  });
  assert.equal(flagged.ok, false);

  const saved = prepareAnalysisSave({
    chessUsername: "Hikaru",
    result: {
      gameCount: 4,
      wins: 2,
      losses: 2,
      draws: 0,
      winRate: 50,
      summary: "Look at the Sicilian.",
      dateRange: { from: "2026-09-01", to: "2026-10-01" },
      weaknesses: [
        { opening: "Sicilian Defense", color: "black", winRate: 25, gameCount: 4 },
      ],
    },
  });
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  assert.equal(saved.save.chessUsername, "Hikaru");
  assert.equal(saved.save.openings.length, 1);
  assert.equal(saved.save.openings[0]?.wins, 1);
  assert.equal(saved.save.dateFrom, "2026-09-01");
  assert.equal(saved.save.summary, "Look at the Sicilian.");
});
