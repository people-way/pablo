"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import type { OpeningWeakness, OpeningsAnalysisResult } from "@/app/api/analyze/openings/route";

// ─── Types ───────────────────────────────────────────────────────────────────

type Step = "input" | "loading" | "report";

type ImportApiResponse = {
  games: unknown[];
  count: number;
  error?: { code: string; message: string };
};

// ─── Loading messages ─────────────────────────────────────────────────────────

const LOADING_MESSAGES = [
  "Fetching your last 50 games...",
  "Scanning your opening choices...",
  "Grouping by opening family...",
  "Hmm. I see something in your games...",
  "Building your weakness report...",
];

const MESSAGE_DURATION_MS = 1300;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateShort(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function winRateColor(rate: number) {
  if (rate < 30) return "#ff7070";
  if (rate < 45) return "#e8a84c";
  return "#8ce0ac";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepInput({
  onSubmit,
  apiError,
}: {
  onSubmit: (username: string) => void;
  apiError?: string;
}) {
  const [value, setValue] = useState("");
  const [localError, setLocalError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setLocalError("Enter a Chess.com username to continue.");
      return;
    }
    setLocalError("");
    onSubmit(trimmed);
  }

  return (
    <div
      className="chess-pattern min-h-screen flex items-center justify-center px-6 py-16"
      style={{ background: "var(--bg-primary)" }}
    >
      <div
        className="w-full max-w-lg animate-fadeInUp"
        style={{ animationDelay: "0.05s", opacity: 0 }}
      >
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm mb-10 transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          <span>←</span>
          <span>Back</span>
        </Link>

        {/* Avatar glyph */}
        <div
          className="mb-6 flex items-center gap-3"
          style={{ color: "var(--gold)" }}
        >
          <span
            style={{
              fontSize: "2.4rem",
              lineHeight: 1,
              filter: "drop-shadow(0 0 12px rgba(201,168,76,0.5))",
            }}
          >
            ♞
          </span>
          <span
            className="text-xs font-bold tracking-[0.35em] uppercase"
            style={{ color: "var(--gold)" }}
          >
            Pablo
          </span>
        </div>

        {/* Heading */}
        <h1
          className="text-4xl font-bold leading-tight sm:text-5xl mb-3"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          Enter your Chess.com username
        </h1>
        <p
          className="text-base leading-7 mb-8"
          style={{ color: "var(--text-secondary)" }}
        >
          Pablo will analyze your last 50 games for free — no account needed.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (localError) setLocalError("");
              }}
              placeholder="hikaru"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className="w-full rounded-2xl border px-5 py-4 text-xl outline-none transition-all"
              style={{
                borderColor: localError
                  ? "rgba(224,97,97,0.5)"
                  : "var(--border-gold)",
                background: "rgba(14, 16, 19, 0.9)",
                color: "var(--text-primary)",
                boxShadow: localError
                  ? "0 0 0 1px rgba(224,97,97,0.2)"
                  : "inset 0 1px 3px rgba(0,0,0,0.5)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--gold-dim)";
                e.currentTarget.style.boxShadow =
                  "0 0 0 3px rgba(201,168,76,0.12), inset 0 1px 3px rgba(0,0,0,0.5)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = localError
                  ? "rgba(224,97,97,0.5)"
                  : "var(--border-gold)";
                e.currentTarget.style.boxShadow = "";
              }}
            />
            {localError && (
              <p className="text-sm" style={{ color: "#ff9a9a" }}>
                {localError}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="btn-gold w-full rounded-2xl py-4 text-base font-bold tracking-wide"
            style={{ color: "#0a0b0c", fontSize: "1.05rem" }}
          >
            Analyze My Games
          </button>
        </form>

        {/* API error */}
        {apiError && (
          <div
            className="mt-4 rounded-2xl border p-4"
            style={{
              borderColor: "rgba(224,97,97,0.28)",
              background: "rgba(60,15,15,0.9)",
            }}
          >
            <p
              className="text-xs font-bold tracking-[0.24em] uppercase mb-2"
              style={{ color: "#ff9a9a" }}
            >
              Hmm, ran into a problem
            </p>
            <p className="text-sm leading-6" style={{ color: "#ffcaca" }}>
              {apiError}
            </p>
          </div>
        )}

        {/* Trust line */}
        <p
          className="mt-6 text-center text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          Uses the public Chess.com API · No signup required
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function StepLoading() {
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    if (visibleCount >= LOADING_MESSAGES.length) return;
    const t = setTimeout(() => setVisibleCount((n) => n + 1), MESSAGE_DURATION_MS);
    return () => clearTimeout(t);
  }, [visibleCount]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-16"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="w-full max-w-md flex flex-col items-center gap-8">
        {/* Pulsing chess piece */}
        <div
          style={{
            fontSize: "4rem",
            lineHeight: 1,
            color: "var(--gold)",
            animation: "pulsegold 1.6s ease-in-out infinite",
            filter: "drop-shadow(0 0 20px rgba(201,168,76,0.45))",
          }}
        >
          ♟
        </div>

        {/* Sequential messages */}
        <div className="w-full flex flex-col gap-3">
          {LOADING_MESSAGES.slice(0, visibleCount).map((msg, i) => {
            const isLatest = i === visibleCount - 1;
            return (
              <div
                key={i}
                className="flex items-center gap-3 animate-fadeInUp"
                style={{
                  animationDuration: "0.5s",
                  animationFillMode: "both",
                }}
              >
                {/* Dot indicator */}
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: isLatest ? "var(--gold)" : "var(--text-muted)",
                    boxShadow: isLatest
                      ? "0 0 8px rgba(201,168,76,0.7)"
                      : undefined,
                    transition: "background 0.3s ease",
                  }}
                />
                <p
                  className="text-base leading-6"
                  style={{
                    color: isLatest ? "var(--text-primary)" : "var(--text-muted)",
                    fontWeight: isLatest ? 500 : 400,
                    transition: "color 0.3s ease",
                  }}
                >
                  {msg}
                </p>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div
          className="w-full rounded-full overflow-hidden"
          style={{
            height: 2,
            background: "var(--border)",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${(visibleCount / LOADING_MESSAGES.length) * 100}%`,
              background:
                "linear-gradient(90deg, var(--gold-dim), var(--gold-light))",
              transition: `width ${MESSAGE_DURATION_MS * 0.9}ms ease`,
              borderRadius: "9999px",
              boxShadow: "0 0 8px rgba(201,168,76,0.5)",
            }}
          />
        </div>

        <p
          className="text-sm text-center"
          style={{ color: "var(--text-muted)" }}
        >
          This takes a few seconds...
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ report }: { report: OpeningsAnalysisResult }) {
  const from = report.dateRange?.from ? formatDateShort(report.dateRange.from) : null;
  const to = report.dateRange?.to ? formatDateShort(report.dateRange.to) : null;
  const dateLabel =
    from && to && from !== to ? `${from} – ${to}` : from ?? null;

  return (
    <div
      className="rounded-[1.75rem] border p-6 sm:p-8"
      style={{
        borderColor: "rgba(201,168,76,0.18)",
        background:
          "linear-gradient(135deg, rgba(22,18,10,0.95) 0%, rgba(14,16,19,0.98) 100%)",
        boxShadow: "0 24px 72px rgba(0,0,0,0.4)",
      }}
    >
      {/* Label */}
      <p
        className="text-xs font-bold tracking-[0.32em] uppercase mb-4"
        style={{ color: "var(--gold)" }}
      >
        Overall Performance
      </p>

      {/* Headline */}
      <p
        className="text-2xl font-bold mb-6 sm:text-3xl"
        style={{ fontFamily: "var(--font-playfair), serif" }}
      >
        Pablo analyzed{" "}
        <span className="gold-text">{report.gameCount}</span>{" "}
        {report.gameCount === 1 ? "game" : "games"}.
      </p>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Wins", value: report.wins, color: "#8ce0ac" },
          { label: "Losses", value: report.losses, color: "#ff9a9a" },
          { label: "Draws", value: report.draws, color: "var(--gold-light)" },
          {
            label: "Win Rate",
            value: `${report.winRate}%`,
            color: winRateColor(report.winRate),
          },
        ].map((s) => (
          <div
            key={s.label}
            className="flex flex-col gap-1 rounded-2xl border p-4"
            style={{
              borderColor: "var(--border)",
              background: "rgba(10,11,12,0.6)",
            }}
          >
            <span
              className="text-2xl font-bold"
              style={{ color: s.color, fontFamily: "var(--font-playfair), serif" }}
            >
              {s.value}
            </span>
            <span
              className="text-xs font-medium tracking-wider uppercase"
              style={{ color: "var(--text-muted)" }}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {dateLabel && (
        <p
          className="mt-4 text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          Games from {dateLabel}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function WeaknessCard({
  weakness,
  rank,
}: {
  weakness: OpeningWeakness;
  rank: number;
}) {
  const colorLabel = weakness.color === "white" ? "as White" : "as Black";
  const badgeColor =
    weakness.color === "white"
      ? { border: "rgba(240,237,232,0.2)", bg: "rgba(240,237,232,0.07)", text: "#f0ede8" }
      : { border: "rgba(80,60,30,0.4)", bg: "rgba(30,20,5,0.5)", text: "var(--gold)" };

  const winRateCol = winRateColor(weakness.winRate);

  return (
    <article
      className="rounded-[1.75rem] border p-6 sm:p-7 flex flex-col gap-5"
      style={{
        borderColor:
          rank === 0
            ? "rgba(224,97,97,0.25)"
            : "rgba(201,168,76,0.12)",
        background:
          rank === 0
            ? "linear-gradient(160deg, rgba(35,14,14,0.96) 0%, rgba(14,16,19,0.99) 100%)"
            : "linear-gradient(160deg, rgba(18,16,12,0.96) 0%, rgba(12,14,17,0.99) 100%)",
        boxShadow:
          rank === 0
            ? "0 16px 56px rgba(224,97,97,0.08)"
            : "0 16px 40px rgba(0,0,0,0.3)",
      }}
    >
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          {rank === 0 && (
            <p
              className="text-xs font-bold tracking-[0.3em] uppercase"
              style={{ color: "#ff9a9a" }}
            >
              Biggest Weakness
            </p>
          )}
          <h3
            className="text-xl font-bold sm:text-2xl"
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            {weakness.opening}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full border px-3 py-1 text-xs font-bold tracking-wider uppercase"
              style={{
                borderColor: badgeColor.border,
                background: badgeColor.bg,
                color: badgeColor.text,
              }}
            >
              {colorLabel}
            </span>
          </div>
        </div>

        {/* Win rate badge */}
        <div
          className="flex-shrink-0 rounded-2xl border px-4 py-3 text-center"
          style={{
            borderColor: `${winRateCol}28`,
            background: `${winRateCol}0f`,
          }}
        >
          <span
            className="block text-2xl font-bold"
            style={{
              color: winRateCol,
              fontFamily: "var(--font-playfair), serif",
            }}
          >
            {weakness.winRate}%
          </span>
          <span
            className="block text-xs mt-1"
            style={{ color: "var(--text-muted)" }}
          >
            {weakness.gameCount} {weakness.gameCount === 1 ? "game" : "games"}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="divider-gold" />

      {/* Diagnosis */}
      <p
        className="text-sm leading-7"
        style={{ color: "var(--text-secondary)" }}
      >
        {weakness.diagnosis}
      </p>

      {/* Key problem */}
      <div
        className="rounded-2xl border p-4"
        style={{
          borderColor: "rgba(224,97,97,0.15)",
          background: "rgba(224,97,97,0.05)",
        }}
      >
        <p
          className="text-xs font-bold tracking-[0.24em] uppercase mb-2"
          style={{ color: "#ff9a9a" }}
        >
          Key problem
        </p>
        <p
          className="text-sm leading-6"
          style={{ color: "var(--text-secondary)" }}
        >
          {weakness.keyProblem}
        </p>
      </div>

      {/* What to do */}
      <div
        className="rounded-2xl border p-4"
        style={{
          borderColor: "rgba(75,181,122,0.15)",
          background: "rgba(75,181,122,0.04)",
        }}
      >
        <p
          className="text-xs font-bold tracking-[0.24em] uppercase mb-2"
          style={{ color: "#8ce0ac" }}
        >
          What to do
        </p>
        <p
          className="text-sm leading-6"
          style={{ color: "var(--text-secondary)" }}
        >
          {weakness.whatToDo}
        </p>
      </div>

      {/* Teaser CTA */}
      <div
        className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"
        style={{
          borderColor: "rgba(201,168,76,0.15)",
          background: "rgba(201,168,76,0.05)",
        }}
      >
        <p
          className="text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          Pablo has a full prep plan for this.
        </p>
        <Link
          href="/upgrade"
          className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold transition-colors whitespace-nowrap"
          style={{
            borderColor: "rgba(201,168,76,0.3)",
            color: "var(--gold-light)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--gold)";
            e.currentTarget.style.background = "rgba(201,168,76,0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(201,168,76,0.3)";
            e.currentTarget.style.background = "";
          }}
        >
          Upgrade to Pro
          <span>→</span>
        </Link>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function PabloSummaryCard({ summary }: { summary: string }) {
  // Strip trailing "— Pablo" if present; we'll render it separately
  const cleaned = summary.replace(/\s*—\s*Pablo\s*$/, "");

  return (
    <div
      className="rounded-[1.75rem] border p-6 sm:p-8 relative overflow-hidden"
      style={{
        borderColor: "rgba(201,168,76,0.2)",
        background:
          "linear-gradient(150deg, rgba(20,16,8,0.98) 0%, rgba(8,9,11,0.99) 100%)",
        boxShadow:
          "0 24px 72px rgba(0,0,0,0.5), inset 0 1px 0 rgba(201,168,76,0.08)",
      }}
    >
      {/* Background chess pattern, very subtle */}
      <div
        className="chess-pattern-sm absolute inset-0 pointer-events-none"
        style={{ opacity: 0.3 }}
      />

      <div className="relative">
        {/* Pablo identifier */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="flex items-center justify-center rounded-full border"
            style={{
              width: 42,
              height: 42,
              borderColor: "rgba(201,168,76,0.3)",
              background: "rgba(201,168,76,0.1)",
              color: "var(--gold)",
              fontSize: "1.3rem",
              flexShrink: 0,
            }}
          >
            ♞
          </div>
          <div>
            <p
              className="text-sm font-bold"
              style={{ color: "var(--gold-light)" }}
            >
              Pablo
            </p>
            <p
              className="text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              Your opening coach
            </p>
          </div>
        </div>

        {/* Quote mark */}
        <span
          style={{
            fontSize: "5rem",
            lineHeight: 0.8,
            color: "rgba(201,168,76,0.12)",
            fontFamily: "var(--font-playfair), serif",
            display: "block",
            marginBottom: "0.5rem",
            userSelect: "none",
          }}
        >
          "
        </span>

        {/* Summary text */}
        <p
          className="text-base leading-8 sm:text-lg"
          style={{
            color: "var(--text-primary)",
            fontFamily: "var(--font-playfair), serif",
          }}
        >
          {cleaned}
        </p>

        {/* Signature */}
        <p
          className="mt-5 text-base font-medium italic"
          style={{
            color: "var(--gold)",
            fontFamily: "var(--font-playfair), serif",
          }}
        >
          — Pablo
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function UpgradeCTA({ worstOpening }: { worstOpening: string | null }) {
  const label = worstOpening
    ? `Ready to fix your ${worstOpening} for good?`
    : "Ready to take your openings to the next level?";

  return (
    <div
      className="rounded-[1.75rem] border p-8 sm:p-10 flex flex-col items-center text-center gap-5"
      style={{
        borderColor: "rgba(201,168,76,0.25)",
        background:
          "linear-gradient(160deg, rgba(28,22,8,0.98) 0%, rgba(12,14,18,0.99) 100%)",
        boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
      }}
    >
      <p
        className="text-xs font-bold tracking-[0.35em] uppercase"
        style={{ color: "var(--gold)" }}
      >
        Pablo Pro
      </p>

      <h2
        className="text-3xl font-bold sm:text-4xl max-w-lg"
        style={{ fontFamily: "var(--font-playfair), serif" }}
      >
        {label}
      </h2>

      <p
        className="text-base leading-7 max-w-md"
        style={{ color: "var(--text-secondary)" }}
      >
        Get a full opening prep plan, move-by-move analysis, and a
        personalized study sequence — built around your actual games.
      </p>

      <Link
        href="/upgrade"
        className="btn-gold mt-2 inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-base font-bold"
        style={{ color: "#0a0b0c" }}
      >
        Build My Opening Plan with Pablo Pro
        <span>→</span>
      </Link>

      <p
        className="text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        Cancel anytime · No hidden fees
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function StepReport({
  report,
  username,
  onReset,
}: {
  report: OpeningsAnalysisResult;
  username: string;
  onReset: () => void;
}) {
  const worstOpening =
    report.weaknesses.length > 0 ? report.weaknesses[0].opening : null;

  return (
    <main
      className="min-h-screen px-5 py-10 sm:px-8 lg:px-12"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <span style={{ color: "var(--gold)", fontSize: "1.4rem" }}>♞</span>
            <span
              className="text-sm font-bold tracking-[0.25em] uppercase"
              style={{ color: "var(--gold)" }}
            >
              Pablo
            </span>
          </div>
          <button
            onClick={onReset}
            className="rounded-full border px-4 py-2 text-sm font-medium transition-colors"
            style={{
              borderColor: "var(--border)",
              color: "var(--text-secondary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--gold-dim)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            Analyze another player
          </button>
        </div>

        {/* Headline */}
        <div className="animate-fadeInUp" style={{ opacity: 0, animationDelay: "0.05s" }}>
          <p
            className="text-xs font-bold tracking-[0.3em] uppercase mb-2"
            style={{ color: "var(--text-muted)" }}
          >
            Opening Report
          </p>
          <h1
            className="text-3xl font-bold sm:text-4xl"
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            {username}&apos;s Opening Profile
          </h1>
        </div>

        {/* Stats card */}
        <div className="animate-fadeInUp" style={{ opacity: 0, animationDelay: "0.12s" }}>
          <StatCard report={report} />
        </div>

        {/* Weakness cards */}
        {report.weaknesses.length > 0 ? (
          <div className="flex flex-col gap-5">
            <p
              className="text-xs font-bold tracking-[0.3em] uppercase animate-fadeInUp"
              style={{ color: "var(--text-muted)", opacity: 0, animationDelay: "0.2s" }}
            >
              Opening Weaknesses · {report.weaknesses.length} found
            </p>
            {report.weaknesses.map((w, i) => (
              <div
                key={`${w.opening}-${w.color}`}
                className="animate-fadeInUp"
                style={{ opacity: 0, animationDelay: `${0.25 + i * 0.1}s` }}
              >
                <WeaknessCard weakness={w} rank={i} />
              </div>
            ))}
          </div>
        ) : (
          <div
            className="rounded-[1.75rem] border p-6 animate-fadeInUp"
            style={{
              borderColor: "rgba(75,181,122,0.2)",
              background: "rgba(75,181,122,0.05)",
              opacity: 0,
              animationDelay: "0.2s",
            }}
          >
            <p className="text-sm font-bold" style={{ color: "#8ce0ac" }}>
              No major opening weaknesses found.
            </p>
            <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
              Your opening results look solid across the board. Your losses are coming from
              elsewhere — middlegame plans or endgame technique. That&apos;s where the deeper work is.
            </p>
          </div>
        )}

        {/* Pablo summary */}
        <div className="animate-fadeInUp" style={{ opacity: 0, animationDelay: "0.45s" }}>
          <PabloSummaryCard summary={report.summary} />
        </div>

        {/* Upgrade CTA */}
        <div className="animate-fadeInUp" style={{ opacity: 0, animationDelay: "0.55s" }}>
          <UpgradeCTA worstOpening={worstOpening} />
        </div>
      </div>
    </main>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AnalyzePage() {
  const [step, setStep] = useState<Step>("input");
  const [report, setReport] = useState<OpeningsAnalysisResult | null>(null);
  const [username, setUsername] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Keep a ref for min loading time — we want at least the full animation
  const minLoadTimeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const analysisReadyRef = useRef<OpeningsAnalysisResult | null>(null);
  const analysisErrorRef = useRef<string | null>(null);

  const finishLoading = useCallback(() => {
    if (analysisErrorRef.current) {
      setErrorMessage(analysisErrorRef.current);
      setStep("input");
    } else if (analysisReadyRef.current) {
      setReport(analysisReadyRef.current);
      setStep("report");
    }
  }, []);

  async function handleSubmit(user: string) {
    setUsername(user);
    setErrorMessage("");
    analysisReadyRef.current = null;
    analysisErrorRef.current = null;
    setStep("loading");

    // Minimum display time: all 5 messages × MESSAGE_DURATION_MS + small buffer
    const minMs = LOADING_MESSAGES.length * MESSAGE_DURATION_MS + 600;
    let minElapsed = false;
    let analysisSettled = false;

    const tryFinish = () => {
      if (minElapsed && analysisSettled) finishLoading();
    };

    minLoadTimeRef.current = setTimeout(() => {
      minElapsed = true;
      tryFinish();
    }, minMs);

    try {
      // Step A: import games
      const importRes = await fetch(
        `/api/import/chess-com?username=${encodeURIComponent(user)}`,
      );
      const importData = (await importRes.json()) as ImportApiResponse;

      if (!importRes.ok || importData.error) {
        const code = importData.error?.code;
        if (code === "not_found" || importRes.status === 404) {
          analysisErrorRef.current = `I couldn't find a Chess.com account for "${user}". Double-check the spelling — Chess.com usernames are case-sensitive.`;
        } else {
          analysisErrorRef.current =
            importData.error?.message ??
            "Chess.com didn't respond the way I expected. Try again in a moment.";
        }
        analysisSettled = true;
        tryFinish();
        return;
      }

      const games = importData.games;
      if (!games || games.length === 0) {
        analysisErrorRef.current = `I found your Chess.com account, but there are no recent games to analyze. Play a few games and come back.`;
        analysisSettled = true;
        tryFinish();
        return;
      }

      // Step B: analyze openings
      const analyzeRes = await fetch("/api/analyze/openings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ games, username: user }),
      });
      const analyzeData = (await analyzeRes.json()) as
        | OpeningsAnalysisResult
        | { error: { code: string; message: string } };

      if (!analyzeRes.ok || "error" in analyzeData) {
        const errMsg =
          "error" in analyzeData
            ? analyzeData.error.message
            : "The analysis engine hit a problem. Your games were imported — try again.";
        analysisErrorRef.current = errMsg;
      } else {
        analysisReadyRef.current = analyzeData;
      }

      analysisSettled = true;
      tryFinish();
    } catch {
      analysisErrorRef.current =
        "Couldn't reach the server. Check your connection and try again.";
      analysisSettled = true;
      tryFinish();
    }
  }

  function handleReset() {
    if (minLoadTimeRef.current) clearTimeout(minLoadTimeRef.current);
    setStep("input");
    setReport(null);
    setErrorMessage("");
    setUsername("");
    analysisReadyRef.current = null;
    analysisErrorRef.current = null;
  }

  if (step === "loading") {
    return <StepLoading />;
  }

  if (step === "report" && report) {
    return <StepReport report={report} username={username} onReset={handleReset} />;
  }

  return <StepInput onSubmit={handleSubmit} apiError={errorMessage || undefined} />;
}
