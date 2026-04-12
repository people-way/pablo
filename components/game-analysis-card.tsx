"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type {
  AnalysisPerspective,
  GameAnalysisReport,
} from "@/lib/chess-analysis";

type GameAnalysisCardProps = {
  pgn: string;
  perspective: AnalysisPerspective;
  isTrial?: boolean;
};

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

const PAYMENT_LINK = "https://buy.stripe.com/aFa3cwgu016v36q9gLeOs0Y";

export function GameAnalysisCard({
  pgn,
  perspective,
  isTrial = false,
}: GameAnalysisCardProps) {
  const [report, setReport] = useState<GameAnalysisReport | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function runAnalysis() {
    setErrorMessage("");

    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pgn,
        perspective,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | GameAnalysisReport
      | ApiErrorResponse
      | null;

    if (!response.ok) {
      setReport(null);
      setErrorMessage(
        payload &&
          "error" in payload &&
          typeof payload.error?.message === "string"
          ? payload.error.message
          : "Analysis failed.",
      );
      return;
    }

    setReport(payload as GameAnalysisReport);
  }

  const previewBlunders = report?.blunders.slice(0, isTrial ? 1 : report.blunders.length) ?? [];
  const hiddenBlunderCount = report ? report.blunders.length - previewBlunders.length : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p
            className="text-xs font-bold tracking-[0.24em] uppercase"
            style={{ color: "var(--text-muted)" }}
          >
            {isTrial ? "Free Trial Scan" : "Pablo Scan"}
          </p>
          <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
            {isTrial
              ? "Try one instant report first. Full recurring analysis unlocks after you see the coaching output."
              : "Heuristic v1: missed mates in 1-2 and immediately hanging pieces."}
          </p>
        </div>

        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            startTransition(() => {
              void runAnalysis();
            });
          }}
          className="btn-gold inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-bold disabled:cursor-wait disabled:opacity-60"
          style={{ color: "#0a0b0c" }}
        >
          {isPending ? "Analyzing..." : report ? "Run Again" : "Generate Free Report"}
        </button>
      </div>

      {errorMessage ? (
        <div
          className="rounded-2xl border px-4 py-3 text-sm"
          style={{
            borderColor: "rgba(224,97,97,0.28)",
            background: "rgba(77, 17, 17, 0.45)",
            color: "#ffd4d4",
          }}
        >
          {errorMessage}
        </div>
      ) : null}

      {report ? (
        <section
          className="rounded-[1.5rem] border p-4 sm:p-5"
          style={{
            borderColor: "rgba(201,168,76,0.14)",
            background: "rgba(11, 13, 16, 0.82)",
          }}
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]"
                style={{
                  borderColor: "rgba(201,168,76,0.2)",
                  color: "var(--gold-light)",
                  background: "rgba(201,168,76,0.08)",
                }}
              >
                {report.total_moves} plies
              </span>
              <span
                className="rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]"
                style={{
                  borderColor: "rgba(201,168,76,0.2)",
                  color: report.blunders.length > 0 ? "#ffb4a8" : "#8ce0ac",
                  background:
                    report.blunders.length > 0
                      ? "rgba(190, 75, 50, 0.14)"
                      : "rgba(75, 181, 122, 0.12)",
                }}
              >
                {report.blunders.length} blunder
                {report.blunders.length === 1 ? "" : "s"}
              </span>
              {isTrial ? (
                <span
                  className="rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]"
                  style={{
                    borderColor: "rgba(201,168,76,0.2)",
                    color: "var(--gold-light)",
                    background: "rgba(201,168,76,0.08)",
                  }}
                >
                  Trial preview
                </span>
              ) : null}
            </div>

            <p className="text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
              {report.summary}
            </p>

            {previewBlunders.length > 0 ? (
              <div className="grid gap-3">
                {previewBlunders.map((blunder) => (
                  <article
                    key={`${blunder.move_number}-${blunder.move}`}
                    className="rounded-2xl border px-4 py-4"
                    style={{
                      borderColor: "rgba(201,168,76,0.12)",
                      background: "rgba(21, 25, 30, 0.9)",
                    }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.16em]"
                        style={{
                          borderColor: "rgba(201,168,76,0.16)",
                          color: "var(--gold-light)",
                        }}
                      >
                        Move {blunder.move_number}
                      </span>
                      <span
                        className="rounded-full border px-3 py-1 text-xs font-bold"
                        style={{
                          borderColor: "rgba(154,146,137,0.18)",
                          color: "var(--text-primary)",
                        }}
                      >
                        {blunder.move}
                      </span>
                    </div>

                    <p
                      className="mt-3 text-sm leading-6"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {blunder.description}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <div
                className="rounded-2xl border px-4 py-4 text-sm leading-6"
                style={{
                  borderColor: "rgba(75,181,122,0.2)",
                  background: "rgba(75,181,122,0.08)",
                  color: "#b9f3cf",
                }}
              >
                No obvious blunders were flagged in this scan.
              </div>
            )}

            {isTrial ? (
              <div
                className="rounded-[1.5rem] border p-4 sm:p-5"
                style={{
                  borderColor: "rgba(201,168,76,0.16)",
                  background: "linear-gradient(180deg, rgba(201,168,76,0.08), rgba(10,11,12,0.82))",
                }}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="max-w-2xl">
                    <p
                      className="text-xs font-bold tracking-[0.24em] uppercase"
                      style={{ color: "var(--gold)" }}
                    >
                      See the rest with Pablo Pro
                    </p>
                    <h3
                      className="mt-2 text-xl font-bold"
                      style={{ fontFamily: "var(--font-playfair), serif" }}
                    >
                      You got the first coaching hit. Upgrade for the full habit map.
                    </h3>
                    <p className="mt-3 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                      {hiddenBlunderCount > 0
                        ? `${hiddenBlunderCount} more flagged moment${hiddenBlunderCount === 1 ? " is" : "s are"} hidden in this game, plus recurring-pattern reports across your imported history.`
                        : "Unlock recurring-pattern reports across your imported history, weekly coaching summaries, and unlimited scans."}
                    </p>
                    <ul
                      className="mt-4 grid gap-2 text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <li>• Full blunder list for every imported game</li>
                      <li>• Pattern detection across your recent history</li>
                      <li>• Weekly coaching reports and study priorities</li>
                    </ul>
                  </div>

                  <div className="flex flex-col gap-3 sm:min-w-52">
                    <Link
                      href={PAYMENT_LINK}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-gold inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-bold"
                      style={{ color: "#0a0b0c" }}
                    >
                      Unlock Pablo Pro
                    </Link>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Payment appears only after the free report.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
