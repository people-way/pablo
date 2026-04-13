import Link from "next/link";

const PAYMENT_LINK = "https://buy.stripe.com/aFa3cwgu016v36q9gLeOs0Y";

export const metadata = {
  title: "Upgrade to Pablo Pro | Personal Chess Coach",
  description:
    "Unlock unlimited game analysis, full history insights, and your personal improvement roadmap with Pablo Pro.",
};

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 shrink-0 text-amber-400">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      <path
        d="M6 10l3 3 5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const PRO_FEATURES = [
  "Unlimited game analysis — every game you play",
  "Full match history review (last 30 days)",
  "Blunder & mistake breakdown with centipawn loss",
  "Personalized improvement roadmap",
  "Opening repertoire gaps identified",
  "Endgame weakness detection",
  "Time-pressure pattern analysis",
  "Weekly progress reports",
  "Priority analysis queue (< 30 s per game)",
];

export default function UpgradePage() {
  return (
    <main
      className="min-h-screen"
      style={{ background: "var(--bg-primary, #0a0b0c)" }}
    >
      {/* ── NAV ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          background: "rgba(10,11,12,0.88)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <svg viewBox="0 0 32 32" className="w-8 h-8" fill="none">
              <rect width="32" height="32" rx="6" fill="rgba(201,168,76,0.12)" />
              <path
                d="M16 6v4M13 8h6"
                stroke="#c9a84c"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M11 14c0-2.76 2.24-5 5-5s5 2.24 5 5v1H11v-1z"
                fill="#c9a84c"
                opacity="0.5"
              />
              <rect x="9" y="15" width="14" height="3" rx="0.5" fill="#c9a84c" opacity="0.7" />
              <path d="M8 28h16l-1.5-10h-13L8 28z" fill="#c9a84c" opacity="0.9" />
            </svg>
            <span className="text-white font-semibold text-lg tracking-tight">Pablo</span>
          </Link>
          <Link
            href="/analyze"
            className="text-sm"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            ← Back to analysis
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 pt-32 pb-24">
        {/* ── HEADER ── */}
        <div className="text-center mb-16">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
            style={{
              background: "rgba(201,168,76,0.12)",
              border: "1px solid rgba(201,168,76,0.25)",
              color: "#c9a84c",
            }}
          >
            ♔ Pablo Pro
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            Your personal chess coach,
            <br />
            <span style={{ color: "#c9a84c" }}>every single game.</span>
          </h1>
          <p className="text-lg max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.6)" }}>
            Pablo Pro gives you engine-level analysis on every game you play —
            not just your first one. Spot patterns, fix weaknesses, and track
            real improvement over time.
          </p>
        </div>

        {/* ── PRICING CARD ── */}
        <div className="grid md:grid-cols-5 gap-8 items-start">
          {/* Features list */}
          <div
            className="md:col-span-3 rounded-2xl p-8"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <h2 className="text-white font-semibold text-lg mb-6">
              Everything in Pablo Pro
            </h2>
            <ul className="space-y-4">
              {PRO_FEATURES.map((feat) => (
                <li key={feat} className="flex items-start gap-3">
                  <CheckIcon />
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>
                    {feat}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Checkout panel */}
          <div
            className="md:col-span-2 rounded-2xl p-8 sticky top-24"
            style={{
              background: "rgba(201,168,76,0.06)",
              border: "1px solid rgba(201,168,76,0.2)",
            }}
          >
            <div className="mb-2 text-sm font-medium" style={{ color: "#c9a84c" }}>
              Pablo Pro
            </div>
            <div className="flex items-end gap-1 mb-1">
              <span className="text-5xl font-bold text-white">€9</span>
              <span className="text-base pb-2" style={{ color: "rgba(255,255,255,0.45)" }}>
                /month
              </span>
            </div>
            <p className="text-xs mb-8" style={{ color: "rgba(255,255,255,0.4)" }}>
              Cancel anytime. No commitments.
            </p>

            <a
              href={PAYMENT_LINK}
              className="block w-full text-center py-4 rounded-xl font-semibold text-base transition-all duration-200 hover:opacity-90 active:scale-[0.98] mb-4"
              style={{
                background: "linear-gradient(135deg, #c9a84c 0%, #e6c56a 100%)",
                color: "#0a0b0c",
                boxShadow: "0 4px 24px rgba(201,168,76,0.25)",
              }}
            >
              Start Pablo Pro →
            </a>

            <p
              className="text-xs text-center"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              Secure checkout via Stripe. Your first free report is already yours.
            </p>

            <div
              className="mt-6 pt-6"
              style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="flex items-start gap-3 mb-3">
                <span className="text-xl">♟</span>
                <div>
                  <div className="text-xs font-medium text-white mb-0.5">
                    Free trial included
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    You already used your free report. Pro unlocks everything else.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">♞</span>
                <div>
                  <div className="text-xs font-medium text-white mb-0.5">
                    Engine-level depth
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    Powered by Stockfish 18 at depth 10 — the same engine GMs use.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── COMPARE TABLE ── */}
        <div className="mt-16">
          <h2 className="text-white font-semibold text-xl mb-6 text-center">
            Free vs Pro
          </h2>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                  <th
                    className="text-left px-6 py-4 font-medium"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    Feature
                  </th>
                  <th
                    className="text-center px-6 py-4 font-medium"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    Free
                  </th>
                  <th
                    className="text-center px-6 py-4 font-medium"
                    style={{ color: "#c9a84c" }}
                  >
                    Pro
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Games analyzed", "1", "Unlimited"],
                  ["History depth", "Latest game", "30 days"],
                  ["Blunder detection", "✓", "✓"],
                  ["Centipawn loss score", "✓", "✓"],
                  ["Opening gap analysis", "—", "✓"],
                  ["Endgame weaknesses", "—", "✓"],
                  ["Weekly progress report", "—", "✓"],
                  ["Time-pressure patterns", "—", "✓"],
                ].map(([feat, free, pro], i) => (
                  <tr
                    key={feat}
                    style={{
                      background:
                        i % 2 === 0
                          ? "transparent"
                          : "rgba(255,255,255,0.02)",
                      borderTop: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <td
                      className="px-6 py-3.5"
                      style={{ color: "rgba(255,255,255,0.7)" }}
                    >
                      {feat}
                    </td>
                    <td
                      className="text-center px-6 py-3.5"
                      style={{ color: "rgba(255,255,255,0.35)" }}
                    >
                      {free}
                    </td>
                    <td
                      className="text-center px-6 py-3.5 font-medium"
                      style={{ color: "#c9a84c" }}
                    >
                      {pro}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── FINAL CTA ── */}
        <div className="text-center mt-16">
          <a
            href={PAYMENT_LINK}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-base transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #c9a84c 0%, #e6c56a 100%)",
              color: "#0a0b0c",
              boxShadow: "0 4px 32px rgba(201,168,76,0.3)",
            }}
          >
            Start Pablo Pro for €9/month →
          </a>
          <p className="mt-3 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            Cancel anytime · No credit card required for free trial
          </p>
        </div>
      </div>
    </main>
  );
}
