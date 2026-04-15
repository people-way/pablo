"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { DashboardData, OpeningCard } from "@/app/api/dashboard/route";

// ─── Sparkline component ──────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) {
    return (
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
        needs more runs
      </span>
    );
  }
  const W = 80, H = 28;
  const min = Math.min(...data, 0);
  const max = Math.max(...data, 100);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const polyline = pts.join(" ");
  const lastPt = pts[pts.length - 1].split(",");

  return (
    <svg width={W} height={H} style={{ overflow: "visible" }}>
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      <circle
        cx={lastPt[0]}
        cy={lastPt[1]}
        r="3"
        fill={color}
        opacity="0.9"
      />
    </svg>
  );
}

// ─── Mastery badge ────────────────────────────────────────────────────────────

function MasteryPips({ level, color }: { level: number; color: string }) {
  return (
    <div className="flex gap-1 items-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: i <= level ? color : "rgba(255,255,255,0.08)",
            boxShadow: i <= level ? `0 0 5px ${color}80` : undefined,
          }}
        />
      ))}
    </div>
  );
}

// ─── Opening card ─────────────────────────────────────────────────────────────

function OpeningMasteryCard({ card }: { card: OpeningCard }) {
  const trend = card.history.length >= 2
    ? card.history[card.history.length - 1].winRate - card.history[0].winRate
    : null;
  const trendLabel =
    trend !== null
      ? trend > 0
        ? `↑ +${trend}% since first run`
        : trend < 0
        ? `↓ ${trend}% since first run`
        : "→ No change"
      : null;
  const trendColor =
    trend !== null && trend > 0
      ? "#8ce0ac"
      : trend !== null && trend < 0
      ? "#ff9a9a"
      : "var(--text-muted)";

  return (
    <article
      className="rounded-[1.5rem] border flex flex-col gap-4 p-5"
      style={{
        borderColor:
          card.mastery.level <= 1
            ? "rgba(255,112,112,0.2)"
            : card.mastery.level >= 4
            ? `${card.mastery.color}22`
            : "rgba(201,168,76,0.12)",
        background:
          card.mastery.level <= 1
            ? "linear-gradient(135deg, rgba(30,10,10,0.97) 0%, rgba(14,12,10,0.99) 100%)"
            : "linear-gradient(135deg, rgba(16,14,10,0.97) 0%, rgba(12,14,18,0.99) 100%)",
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <h3 className="text-base font-bold leading-tight">{card.opening}</h3>
          <span
            className="text-xs rounded-full border px-2 py-0.5 font-medium w-fit"
            style={{
              borderColor:
                card.color === "white"
                  ? "rgba(240,237,232,0.15)"
                  : "rgba(201,168,76,0.2)",
              color:
                card.color === "white" ? "#d4d1cc" : "var(--gold-light)",
              background:
                card.color === "white"
                  ? "rgba(240,237,232,0.04)"
                  : "rgba(201,168,76,0.06)",
            }}
          >
            as {card.color === "white" ? "White" : "Black"}
          </span>
        </div>

        {/* Win rate */}
        <div className="text-right flex-shrink-0">
          <span
            className="text-xl font-bold"
            style={{
              color: card.mastery.color,
              fontFamily: "var(--font-playfair), serif",
            }}
          >
            {card.winRate}%
          </span>
          <span
            className="block text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            {card.gamesPlayed} games
          </span>
        </div>
      </div>

      {/* Mastery level */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <MasteryPips level={card.mastery.level} color={card.mastery.color} />
          <span
            className="text-xs font-bold tracking-wider uppercase"
            style={{ color: card.mastery.color }}
          >
            {card.mastery.label}
          </span>
        </div>
        <Sparkline
          data={card.history.map((h) => h.winRate)}
          color={card.mastery.color}
        />
      </div>

      {/* Trend */}
      {trendLabel && (
        <p className="text-xs" style={{ color: trendColor }}>
          {trendLabel}
        </p>
      )}

      {/* Badge */}
      {card.badge && (
        <div
          className="flex items-center gap-2 rounded-xl border px-3 py-2"
          style={{
            borderColor: `${card.mastery.color}30`,
            background: `${card.mastery.color}08`,
          }}
        >
          <span style={{ fontSize: "1rem" }}>🏆</span>
          <span className="text-xs font-bold" style={{ color: card.mastery.color }}>
            {card.badge}
          </span>
        </div>
      )}
    </article>
  );
}

// ─── Streak display ───────────────────────────────────────────────────────────

function StreakCounter({ streak }: { streak: number }) {
  return (
    <div
      className="rounded-[1.5rem] border p-5 flex items-center gap-4"
      style={{
        borderColor:
          streak > 0 ? "rgba(232,168,76,0.25)" : "rgba(201,168,76,0.1)",
        background:
          streak > 0
            ? "linear-gradient(135deg, rgba(28,20,6,0.97) 0%, rgba(14,12,10,0.99) 100%)"
            : "rgba(14,12,10,0.99)",
      }}
    >
      <div
        className="flex items-center justify-center rounded-2xl"
        style={{
          width: 52,
          height: 52,
          background:
            streak > 0 ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.04)",
          fontSize: "1.6rem",
          flexShrink: 0,
        }}
      >
        {streak > 0 ? "🔥" : "❄️"}
      </div>
      <div>
        <p
          className="text-2xl font-bold"
          style={{
            color: streak > 0 ? "var(--gold-light)" : "var(--text-muted)",
            fontFamily: "var(--font-playfair), serif",
          }}
        >
          {streak} day{streak !== 1 ? "s" : ""}
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {streak > 0 ? "analysis streak — keep it going" : "run an analysis to start your streak"}
        </p>
      </div>
    </div>
  );
}

// ─── Badge shelf ──────────────────────────────────────────────────────────────

function BadgeShelf({ badges }: { badges: string[] }) {
  if (badges.length === 0) {
    return (
      <div
        className="rounded-[1.5rem] border p-5"
        style={{ borderColor: "rgba(201,168,76,0.08)", background: "rgba(14,12,10,0.8)" }}
      >
        <p
          className="text-xs font-bold tracking-[0.28em] uppercase mb-3"
          style={{ color: "var(--text-muted)" }}
        >
          Badges
        </p>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Reach Level 4 in an opening to unlock your first badge.
        </p>
      </div>
    );
  }
  return (
    <div
      className="rounded-[1.5rem] border p-5"
      style={{
        borderColor: "rgba(201,168,76,0.15)",
        background: "linear-gradient(135deg, rgba(20,16,8,0.97) 0%, rgba(12,14,18,0.99) 100%)",
      }}
    >
      <p
        className="text-xs font-bold tracking-[0.28em] uppercase mb-4"
        style={{ color: "var(--gold)" }}
      >
        Badges Earned · {badges.length}
      </p>
      <div className="flex flex-wrap gap-2">
        {badges.map((badge) => (
          <span
            key={badge}
            className="rounded-full border px-3 py-1.5 text-xs font-bold"
            style={{
              borderColor: "rgba(201,168,76,0.3)",
              background: "rgba(201,168,76,0.08)",
              color: "var(--gold-light)",
            }}
          >
            🏆 {badge}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ username }: { username: string | null }) {
  return (
    <div className="flex flex-col items-center text-center py-16 gap-6 max-w-md mx-auto">
      <div
        style={{
          fontSize: "4rem",
          color: "var(--gold)",
          filter: "drop-shadow(0 0 20px rgba(201,168,76,0.4))",
          animation: "pulsegold 2s ease-in-out infinite",
        }}
      >
        ♟
      </div>
      <div>
        <h2
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          No analyses yet
        </h2>
        <p className="text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
          Run your first analysis to start tracking your opening improvement. Pablo will save the
          results here and show you how you grow over time.
        </p>
      </div>
      <Link
        href={username ? `/analyze?username=${encodeURIComponent(username)}` : "/analyze"}
        className="btn-gold rounded-2xl px-8 py-4 text-base font-bold"
        style={{ color: "#0a0b0c" }}
      >
        Run My First Analysis →
      </Link>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => {
        if (r.status === 401) {
          window.location.href = "/login?redirect=/dashboard";
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d) setData(d as DashboardData);
      })
      .catch(() => setError("Couldn't load your dashboard. Try refreshing."))
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg-primary)" }}
      >
        <div
          style={{
            fontSize: "3rem",
            color: "var(--gold)",
            animation: "pulsegold 1.6s ease-in-out infinite",
          }}
        >
          ♞
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6"
        style={{ background: "var(--bg-primary)" }}
      >
        <div className="text-center">
          <p className="mb-4" style={{ color: "#ff9a9a" }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-gold rounded-xl px-6 py-3 text-sm font-bold"
            style={{ color: "#0a0b0c" }}
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const displayName = data.user.chess_com_username || data.user.email.split("@")[0];
  const hasData = data.openingCards.length > 0;

  // Mastery distribution
  const masteryBreakdown = [1, 2, 3, 4, 5].map((lvl) => ({
    level: lvl,
    count: data.openingCards.filter((c) => c.mastery.level === lvl).length,
  }));

  return (
    <main
      className="min-h-screen px-5 py-8 sm:px-8 lg:px-12"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="mx-auto max-w-5xl">

        {/* ── Header ── */}
        <header className="flex items-center justify-between gap-4 mb-10">
          <div className="flex items-center gap-3">
            <span
              style={{
                fontSize: "1.6rem",
                color: "var(--gold)",
                filter: "drop-shadow(0 0 8px rgba(201,168,76,0.4))",
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
          <div className="flex items-center gap-3">
            <Link
              href="/analyze"
              className="btn-gold rounded-xl px-5 py-2.5 text-sm font-bold"
              style={{ color: "#0a0b0c" }}
            >
              + New Analysis
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-xl border px-4 py-2.5 text-sm transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--border-gold)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.color = "var(--text-muted)";
              }}
            >
              Log out
            </button>
          </div>
        </header>

        {/* ── Welcome ── */}
        <section className="mb-8 animate-fadeInUp" style={{ opacity: 0 }}>
          <div
            className="rounded-[1.75rem] border p-6 sm:p-8 relative overflow-hidden"
            style={{
              borderColor: "rgba(201,168,76,0.2)",
              background:
                "linear-gradient(150deg, rgba(20,16,8,0.98) 0%, rgba(10,11,14,0.99) 100%)",
              boxShadow: "0 16px 56px rgba(0,0,0,0.45)",
            }}
          >
            <div className="chess-pattern-sm absolute inset-0 pointer-events-none" style={{ opacity: 0.25 }} />
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-xs font-bold tracking-[0.3em] uppercase mb-2" style={{ color: "var(--gold)" }}>
                  Welcome back
                </p>
                <h1
                  className="text-2xl font-bold sm:text-3xl"
                  style={{ fontFamily: "var(--font-playfair), serif" }}
                >
                  {hasData
                    ? `Good to see you again, ${displayName}. Here's where you stand.`
                    : `Hey ${displayName}. Let's get started.`}
                </h1>
                {data.recentSummary && (
                  <p
                    className="mt-3 text-sm leading-7 max-w-xl"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {data.recentSummary.replace(/\s*—\s*Pablo\s*$/, "").slice(0, 180)}
                    {data.recentSummary.length > 180 ? "…" : ""}
                  </p>
                )}
              </div>
              {hasData && (
                <div
                  className="flex-shrink-0 rounded-2xl border p-4 text-center"
                  style={{
                    borderColor: "rgba(201,168,76,0.15)",
                    background: "rgba(201,168,76,0.06)",
                    minWidth: 120,
                  }}
                >
                  <p
                    className="text-3xl font-bold"
                    style={{ color: "var(--gold-light)", fontFamily: "var(--font-playfair), serif" }}
                  >
                    {data.totalAnalyses}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    {data.totalAnalyses === 1 ? "run" : "total runs"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {!hasData ? (
          <EmptyState username={data.user.chess_com_username} />
        ) : (
          <>
            {/* ── Stats row ── */}
            <section
              className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 animate-fadeInUp"
              style={{ opacity: 0, animationDelay: "0.1s" }}
            >
              <StreakCounter streak={data.streak} />
              <BadgeShelf badges={data.badges} />
            </section>

            {/* ── Mastery summary ── */}
            {hasData && (
              <section
                className="mb-6 animate-fadeInUp"
                style={{ opacity: 0, animationDelay: "0.18s" }}
              >
                <div
                  className="rounded-[1.5rem] border p-5"
                  style={{
                    borderColor: "rgba(201,168,76,0.12)",
                    background: "rgba(14,12,10,0.9)",
                  }}
                >
                  <p
                    className="text-xs font-bold tracking-[0.28em] uppercase mb-4"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Mastery Distribution
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    {[
                      { level: 1, label: "Danger Zone", color: "#ff7070" },
                      { level: 2, label: "Building", color: "#e8a84c" },
                      { level: 3, label: "Solid", color: "#c9a84c" },
                      { level: 4, label: "Strong", color: "#8ce0ac" },
                      { level: 5, label: "Mastered", color: "#4bff8a" },
                    ].map(({ level, label, color }) => {
                      const count = masteryBreakdown.find((m) => m.level === level)?.count ?? 0;
                      return (
                        <div
                          key={level}
                          className="flex items-center gap-2 rounded-xl border px-3 py-2"
                          style={{
                            borderColor: count > 0 ? `${color}22` : "rgba(255,255,255,0.04)",
                            background: count > 0 ? `${color}08` : "transparent",
                          }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: count > 0 ? color : "rgba(255,255,255,0.1)",
                              display: "inline-block",
                              flexShrink: 0,
                            }}
                          />
                          <span
                            className="text-xs font-medium"
                            style={{ color: count > 0 ? color : "var(--text-muted)" }}
                          >
                            {count}× {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* ── Opening cards ── */}
            <section>
              <p
                className="text-xs font-bold tracking-[0.28em] uppercase mb-4 animate-fadeInUp"
                style={{ color: "var(--text-muted)", opacity: 0, animationDelay: "0.25s" }}
              >
                Opening Mastery · {data.openingCards.length} tracked
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.openingCards.map((card, i) => (
                  <div
                    key={`${card.opening}-${card.color}`}
                    className="animate-fadeInUp"
                    style={{ opacity: 0, animationDelay: `${0.3 + i * 0.06}s` }}
                  >
                    <OpeningMasteryCard card={card} />
                  </div>
                ))}
              </div>
            </section>

            {/* ── Run new analysis CTA ── */}
            <section
              className="mt-8 animate-fadeInUp"
              style={{ opacity: 0, animationDelay: "0.5s" }}
            >
              <div
                className="rounded-[1.75rem] border p-7 flex flex-col sm:flex-row items-center justify-between gap-5"
                style={{
                  borderColor: "rgba(201,168,76,0.18)",
                  background:
                    "linear-gradient(135deg, rgba(22,18,8,0.97) 0%, rgba(12,14,18,0.99) 100%)",
                }}
              >
                <div>
                  <p
                    className="text-xs font-bold tracking-[0.3em] uppercase mb-1"
                    style={{ color: "var(--gold)" }}
                  >
                    Keep the streak going
                  </p>
                  <p
                    className="text-lg font-bold"
                    style={{ fontFamily: "var(--font-playfair), serif" }}
                  >
                    Run a new analysis to update your progress
                  </p>
                </div>
                <Link
                  href={
                    data.user.chess_com_username
                      ? `/analyze?username=${encodeURIComponent(data.user.chess_com_username)}`
                      : "/analyze"
                  }
                  className="btn-gold flex-shrink-0 rounded-2xl px-7 py-3.5 text-sm font-bold whitespace-nowrap"
                  style={{ color: "#0a0b0c" }}
                >
                  Analyze My Games →
                </Link>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
