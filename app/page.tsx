import Link from "next/link";

const PAYMENT_LINK = "https://buy.stripe.com/aFa3cwgu016v36q9gLeOs0Y";

// Chess piece SVG icons
function ChessboardIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="5" width="7" height="7" fill="currentColor" opacity="0.8"/>
      <rect x="19" y="5" width="7" height="7" fill="currentColor" opacity="0.8"/>
      <rect x="12" y="12" width="7" height="7" fill="currentColor" opacity="0.8"/>
      <rect x="26" y="12" width="7" height="7" fill="currentColor" opacity="0.8"/>
      <rect x="5" y="19" width="7" height="7" fill="currentColor" opacity="0.8"/>
      <rect x="19" y="19" width="7" height="7" fill="currentColor" opacity="0.8"/>
      <rect x="12" y="26" width="7" height="7" fill="currentColor" opacity="0.8"/>
      <rect x="26" y="26" width="7" height="7" fill="currentColor" opacity="0.8"/>
      <rect x="5" y="5" width="30" height="30" rx="1" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
    </svg>
  );
}

function BrainIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 8C16 8 12 11 12 15c0 2 1 4 2 5-3 1-5 4-5 7 0 4 3 7 7 7h8c4 0 7-3 7-7 0-3-2-6-5-7 1-1 2-3 2-5 0-4-4-7-8-7z"
        stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15"/>
      <path d="M20 14v12M16 18l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function TrendIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 30L16 18l6 6 12-16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M28 8h6v6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="16" cy="18" r="2" fill="currentColor" opacity="0.6"/>
      <circle cx="22" cy="24" r="2" fill="currentColor" opacity="0.6"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 shrink-0">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
      <path d="M6 10l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const boardPieces: Record<number, string> = {
  0: "♜", 1: "♞", 2: "♝", 3: "♛", 4: "♚", 5: "♝", 6: "♞", 7: "♜",
  8: "♟", 9: "♟", 10: "♟", 11: "♟", 12: "♟", 13: "♟", 14: "♟", 15: "♟",
  48: "♙", 49: "♙", 50: "♙", 51: "♙", 52: "♙", 53: "♙", 54: "♙", 55: "♙",
  56: "♖", 57: "♘", 58: "♗", 59: "♕", 60: "♔", 61: "♗", 62: "♘", 63: "♖",
};

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden" style={{ background: "var(--bg-primary)" }}>

      {/* ─── NAV ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50" style={{
        background: "rgba(10,11,12,0.88)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border)"
      }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 32 32" className="w-8 h-8" fill="none">
              <rect width="32" height="32" rx="6" fill="rgba(201,168,76,0.12)"/>
              <path d="M16 6v4M13 8h6" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round"/>
              <path d="M11 14c0-2.76 2.24-5 5-5s5 2.24 5 5v1H11v-1z" fill="#c9a84c" opacity="0.5"/>
              <rect x="9" y="15" width="14" height="3" rx="0.5" fill="#c9a84c" opacity="0.7"/>
              <path d="M8 28h16l-1.5-10h-13L8 28z" fill="#c9a84c" opacity="0.9"/>
            </svg>
            <span style={{
              fontFamily: "var(--font-playfair), serif",
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "var(--gold-light)"
            }}>Pablo</span>
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8" style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            <a href="#features" className="transition-colors hover:text-amber-400">Features</a>
            <a href="#how-it-works" className="transition-colors hover:text-amber-400">How It Works</a>
            <a href="#pricing" className="transition-colors hover:text-amber-400">Pricing</a>
          </div>

          <Link
            href={PAYMENT_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold text-sm font-bold px-5 py-2.5 rounded-lg"
            style={{ color: "#0a0b0c" }}
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 overflow-hidden">
        {/* Chess pattern bg */}
        <div className="absolute inset-0 chess-pattern" />
        {/* Gold radial glow */}
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(201,168,76,0.07) 0%, transparent 70%)"
        }} />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-64" style={{
          background: "linear-gradient(to top, var(--bg-primary), transparent)"
        }} />

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          {/* Badge */}
          <div className="animate-fadeInUp inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase"
            style={{
              background: "rgba(201,168,76,0.08)",
              border: "1px solid rgba(201,168,76,0.2)",
              color: "var(--gold)"
            }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "var(--gold)" }} />
            AI Chess Coaching
          </div>

          {/* Headline */}
          <h1 className="animate-fadeInUp delay-100"
            style={{
              fontFamily: "var(--font-playfair), serif",
              fontSize: "clamp(2.5rem, 6vw, 5rem)",
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
              marginBottom: "1.5rem"
            }}>
            Stop Losing Games<br />
            <span className="gold-text">You Should Be Winning.</span>
          </h1>

          {/* Subheadline */}
          <p className="animate-fadeInUp delay-200 max-w-2xl mx-auto mb-10"
            style={{
              fontSize: "clamp(1rem, 2vw, 1.2rem)",
              lineHeight: 1.7,
              color: "var(--text-secondary)"
            }}>
            Pablo analyzes every game you play and delivers brutally honest coaching —
            your exact mistakes, recurring blunder patterns, and a personalized path
            to your next rating milestone.
          </p>

          {/* CTAs */}
          <div className="animate-fadeInUp delay-300 flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <Link
              href={PAYMENT_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gold font-bold px-8 py-4 rounded-xl text-base w-full sm:w-auto"
              style={{ color: "#0a0b0c" }}
            >
              Start Improving — $9/mo
            </Link>
            <a href="#how-it-works"
              className="px-8 py-4 rounded-xl text-base font-medium w-full sm:w-auto text-center transition-all"
              style={{
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}>
              See How It Works ↓
            </a>
          </div>

          {/* Social proof */}
          <div className="animate-fadeInUp delay-400 flex flex-col sm:flex-row items-center justify-center gap-5 text-sm"
            style={{ color: "var(--text-muted)" }}>
            <div className="flex items-center gap-2.5">
              <div className="flex -space-x-2">
                {["♟","♜","♝","♞"].map((p, i) => (
                  <div key={i} className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                    style={{ background: "var(--bg-card)", border: "2px solid var(--bg-primary)", color: "var(--gold)" }}>
                    {p}
                  </div>
                ))}
              </div>
              <span>Trusted by 1,200+ players</span>
            </div>
            <span className="hidden sm:block opacity-20">|</span>
            <div className="flex items-center gap-1.5">
              {[1,2,3,4,5].map(i => (
                <svg key={i} viewBox="0 0 12 12" className="w-3 h-3" style={{ fill: "var(--gold)" }}>
                  <path d="M6 0l1.5 4H12l-3.5 2.5L10 11 6 8.5 2 11l1.5-4.5L0 4h4.5z"/>
                </svg>
              ))}
              <span>4.9/5 average rating</span>
            </div>
          </div>
        </div>

        {/* Dashboard preview */}
        <div className="relative z-10 mt-20 animate-fadeInUp delay-500 px-6 w-full max-w-2xl mx-auto pb-8">
          <div className="rounded-2xl overflow-hidden" style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            boxShadow: "0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(201,168,76,0.05)"
          }}>
            {/* Window chrome */}
            <div className="h-9 flex items-center px-4 gap-2" style={{ borderBottom: "1px solid var(--border)", background: "rgba(0,0,0,0.4)" }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#5a2020" }}/>
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#5a4820" }}/>
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#205a30" }}/>
              <div className="flex-1 text-center text-xs" style={{ color: "var(--text-muted)" }}>pablo.app — Game Analysis</div>
            </div>
            {/* Content */}
            <div className="p-5 grid grid-cols-2 gap-5">
              {/* Mini board */}
              <div className="aspect-square rounded-lg overflow-hidden" style={{ maxWidth: "168px" }}>
                <div className="w-full h-full grid" style={{ gridTemplateColumns: "repeat(8, 1fr)", gridTemplateRows: "repeat(8, 1fr)" }}>
                  {Array.from({ length: 64 }).map((_, i) => {
                    const row = Math.floor(i / 8);
                    const col = i % 8;
                    const isDark = (row + col) % 2 === 1;
                    const isBlackPiece = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].includes(i);
                    return (
                      <div key={i} className="flex items-center justify-center"
                        style={{
                          background: isDark ? "rgba(160,120,50,0.25)" : "rgba(201,168,76,0.05)",
                          color: isBlackPiece ? "#666" : "#ddd",
                          fontSize: "0.65rem",
                          lineHeight: 1
                        }}>
                        {boardPieces[i] || ""}
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Analysis panel */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold tracking-wider uppercase" style={{ color: "var(--gold)" }}>Analysis</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(76,175,100,0.15)", color: "#4caf72" }}>+65 pts</span>
                </div>
                {[
                  { label: "Blunders", val: "2", c: "#e85555" },
                  { label: "Mistakes", val: "4", c: "#e88844" },
                  { label: "Best Moves", val: "18", c: "#4caf72" },
                  { label: "Accuracy", val: "76%", c: "var(--gold)" },
                ].map(({ label, val, c }) => (
                  <div key={label} className="flex items-center justify-between py-1.5 text-sm"
                    style={{ borderBottom: "1px solid var(--border)" }}>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>{label}</span>
                    <span className="font-bold" style={{ color: c, fontSize: "0.85rem" }}>{val}</span>
                  </div>
                ))}
                <div className="mt-1 p-2.5 rounded-lg text-xs leading-relaxed"
                  style={{ background: "rgba(201,168,76,0.06)", border: "1px solid var(--border-gold)", color: "var(--text-secondary)" }}>
                  <strong style={{ color: "var(--text-primary)" }}>Coach: </strong>
                  You&rsquo;re repeatedly missing knight forks on f7 — 4 times in last 10 games.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-28 px-6 relative">
        <div className="absolute inset-0" style={{
          background: "linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 40%, var(--bg-secondary) 60%, var(--bg-primary) 100%)"
        }}/>
        <div className="relative max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-block mb-4 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
              style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.15)", color: "var(--gold)" }}>
              Why Pablo
            </div>
            <h2 style={{
              fontFamily: "var(--font-playfair), serif",
              fontSize: "clamp(1.75rem, 3.5vw, 3rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              marginBottom: "1rem"
            }}>
              Your Games Hold Every Clue<br />
              <span className="gold-text">to Your Next Breakthrough.</span>
            </h2>
            <p className="max-w-xl mx-auto" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              Most players review games hoping to feel better. Pablo shows you exactly
              what to fix — no sugar-coating, no generic advice.
            </p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                Icon: ChessboardIcon,
                title: "Deep Game Analysis",
                desc: "Every move scored. Every deviation from the best line explained. Not just blunders — the subtle inaccuracies that compound into losses.",
                bullets: ["Move-by-move evaluation", "Opening deviations flagged", "Endgame precision scored"],
                highlight: false,
              },
              {
                Icon: BrainIcon,
                title: "Blunder Pattern Recognition",
                desc: "Pablo doesn't just find mistakes — it finds YOUR mistakes. The ones you make repeatedly, across dozens of games, without noticing.",
                bullets: ["Patterns across game history", "Weakness heatmaps by position", "Tactical blindspot reports"],
                highlight: true,
              },
              {
                Icon: TrendIcon,
                title: "Rating Improvement Path",
                desc: "A personalized training roadmap based on your actual games — not generic puzzles. The exact skills that will move your Elo.",
                bullets: ["Personalized study plan", "Progress tracking by theme", "Rating milestone predictions"],
                highlight: false,
              },
            ].map(({ Icon, title, desc, bullets, highlight }, i) => (
              <div key={i} className="feature-card relative rounded-2xl p-8 flex flex-col"
                style={{
                  background: highlight
                    ? "linear-gradient(145deg, rgba(201,168,76,0.09) 0%, rgba(201,168,76,0.04) 100%)"
                    : "var(--bg-card)",
                  border: highlight ? "1px solid rgba(201,168,76,0.3)" : "1px solid var(--border)",
                }}>
                {highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-black"
                    style={{ background: "var(--gold)", color: "#0a0b0c", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    Most Impactful
                  </div>
                )}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
                  style={{ background: "rgba(201,168,76,0.1)", color: "var(--gold)" }}>
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="mb-3" style={{
                  fontFamily: "var(--font-playfair), serif",
                  fontSize: "1.3rem",
                  fontWeight: 700,
                  letterSpacing: "-0.01em"
                }}>
                  {title}
                </h3>
                <p className="mb-6 flex-1 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {desc}
                </p>
                <ul className="flex flex-col gap-2.5">
                  {bullets.map((b, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                      <span style={{ color: "var(--gold)" }}><CheckIcon /></span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── DIVIDER ─── */}
      <div className="divider-gold max-w-4xl mx-auto" />

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block mb-4 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
              style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.15)", color: "var(--gold)" }}>
              The Process
            </div>
            <h2 style={{
              fontFamily: "var(--font-playfair), serif",
              fontSize: "clamp(1.75rem, 3.5vw, 3rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              marginBottom: "1rem"
            }}>
              Three Steps to a<br />
              <span className="gold-text">Better Chess Player.</span>
            </h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: "440px", margin: "0 auto" }}>
              No complicated setup. No fluff. Connect your account and get better.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                num: "01",
                emoji: "♟",
                title: "Connect Your Account",
                desc: "One click to import your last 50 games from Chess.com or Lichess. Pablo syncs automatically so it always has your latest games.",
              },
              {
                num: "02",
                emoji: "⚙",
                title: "Pablo Runs Deep Analysis",
                desc: "Our AI engine processes every game, cross-references patterns across your entire history, and builds your personal coaching report.",
              },
              {
                num: "03",
                emoji: "🎯",
                title: "Get Your Improvement Plan",
                desc: "Wake up to a clear action plan: what to drill, what openings to study, and exactly what's holding back your rating right now.",
              },
            ].map(({ num, emoji, title, desc }, i) => (
              <div key={i} className="flex flex-col">
                <div className="step-num mb-3">{num}</div>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-5"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.3)"
                  }}>
                  {emoji}
                </div>
                <h3 className="mb-3" style={{
                  fontFamily: "var(--font-playfair), serif",
                  fontSize: "1.15rem",
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.3
                }}>
                  {title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── DIVIDER ─── */}
      <div className="divider-gold max-w-4xl mx-auto" />

      {/* ─── TESTIMONIALS ─── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 style={{
              fontFamily: "var(--font-playfair), serif",
              fontSize: "clamp(1.5rem, 3vw, 2.5rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em"
            }}>
              Players Who Stopped Guessing,<br />
              <span className="gold-text">Started Winning.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                quote: "I gained 180 rating points in 3 months. Pablo showed me I was hanging pieces after long combinations — something I never noticed on my own.",
                name: "Alex K.",
                rating: "1640 → 1820 on Lichess",
                piece: "♛",
              },
              {
                quote: "I've tried every improvement method. Pablo is the first thing that felt like having an actual coach — one who watched every single game.",
                name: "Maria S.",
                rating: "1200 → 1390 on Chess.com",
                piece: "♞",
              },
              {
                quote: "The pattern detection is scary accurate. It found I always blunder when I'm ahead on time — a psychological tell I had no idea about.",
                name: "Tom W.",
                rating: "1890 → 2040 on Chess.com",
                piece: "♜",
              },
            ].map(({ quote, name, rating, piece }, i) => (
              <div key={i} className="rounded-2xl p-7" style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)"
              }}>
                <div className="text-3xl mb-4" style={{ color: "var(--gold)", opacity: 0.5 }}>{piece}</div>
                <p className="mb-5 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  &ldquo;{quote}&rdquo;
                </p>
                <div className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{name}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--gold)", opacity: 0.75 }}>{rating}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 chess-pattern opacity-60" />
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(201,168,76,0.06) 0%, transparent 70%)"
        }}/>
        <div className="relative max-w-lg mx-auto">
          <div className="text-center mb-10">
            <div className="inline-block mb-4 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
              style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.15)", color: "var(--gold)" }}>
              Pricing
            </div>
            <h2 style={{
              fontFamily: "var(--font-playfair), serif",
              fontSize: "clamp(1.75rem, 3.5vw, 3rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              marginBottom: "0.75rem"
            }}>
              One Plan.<br />
              <span className="gold-text">Everything Included.</span>
            </h2>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
              No tiers. No limits. Cancel anytime.
            </p>
          </div>

          {/* Card */}
          <div className="rounded-2xl overflow-hidden" style={{
            background: "var(--bg-card)",
            border: "1px solid rgba(201,168,76,0.3)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 60px rgba(201,168,76,0.06)"
          }}>
            <div className="p-8 pb-0">
              <div className="flex items-baseline gap-1 mb-1">
                <span style={{
                  fontFamily: "var(--font-playfair), serif",
                  fontSize: "3.5rem",
                  fontWeight: 700,
                  letterSpacing: "-0.03em"
                }}>$9</span>
                <span className="text-base" style={{ color: "var(--text-muted)" }}>/month</span>
              </div>
              <div className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>Billed monthly · cancel anytime</div>
              <div className="divider-gold mb-6" />
              <ul className="flex flex-col gap-3 mb-8">
                {[
                  "Unlimited game analysis",
                  "Pattern detection across full game history",
                  "Weekly personalized improvement report",
                  "Tactical weakness identification",
                  "Opening repertoire gap analysis",
                  "Rating milestone prediction",
                  "Chess.com + Lichess support",
                  "Priority support",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                    <span style={{ color: "var(--gold)" }}><CheckIcon /></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-8 pt-0">
              <Link
                href={PAYMENT_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold w-full flex items-center justify-center py-4 rounded-xl font-bold text-base"
                style={{ color: "#0a0b0c" }}
              >
                Start Improving Today
              </Link>
              <p className="text-center mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
                30-day money-back guarantee · Secure checkout via Stripe
              </p>
            </div>
          </div>

          {/* Mini FAQ */}
          <div className="mt-8 grid grid-cols-2 gap-4">
            {[
              { q: "Do I need to install anything?", a: "No. Pablo runs fully in your browser." },
              { q: "Which platforms are supported?", a: "Chess.com and Lichess both work." },
            ].map(({ q, a }) => (
              <div key={q} className="rounded-xl p-4" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                <div className="text-xs font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{q}</div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>{a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0" style={{
          background: "linear-gradient(135deg, rgba(201,168,76,0.04) 0%, transparent 60%)"
        }}/>
        <div className="relative max-w-2xl mx-auto">
          <div className="text-6xl mb-6" style={{ lineHeight: 1, userSelect: "none" }}>♚</div>
          <h2 className="mb-4" style={{
            fontFamily: "var(--font-playfair), serif",
            fontSize: "clamp(1.75rem, 4vw, 3.5rem)",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1.1
          }}>
            Your Next 100 Rating Points<br />
            <span className="gold-text">Are Already In Your Games.</span>
          </h2>
          <p className="mb-10 text-lg" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
            Stop replaying games hoping for insight.<br />
            Let Pablo find what you can&rsquo;t see.
          </p>
          <Link
            href={PAYMENT_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold inline-flex items-center gap-3 px-10 py-5 rounded-xl font-bold text-lg"
            style={{ color: "#0a0b0c" }}
          >
            Get Pablo Pro — $9/mo
            <span>→</span>
          </Link>
          <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
            30-day money-back guarantee. Cancel anytime.
          </p>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-12 px-6" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span style={{
              fontFamily: "var(--font-playfair), serif",
              fontSize: "1.1rem",
              fontWeight: 700,
              color: "var(--gold)"
            }}>Pablo</span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>— Your chess coach that never sleeps.</span>
          </div>
          <div className="flex items-center gap-6 text-xs" style={{ color: "var(--text-muted)" }}>
            <a href="#" className="transition-colors hover:text-gray-400">Privacy</a>
            <a href="#" className="transition-colors hover:text-gray-400">Terms</a>
            <a href="mailto:hello@pablo.app" className="transition-colors hover:text-gray-400">Contact</a>
            <span>© 2026 Pablo</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
