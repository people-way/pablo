import Form from "next/form";
import Link from "next/link";
import { GameAnalysisCard } from "@/components/game-analysis-card";
import {
  ChessComImportError,
  importRecentChessComGames,
  type ImportedChessComGame,
} from "@/lib/chess-com";

type AnalyzePageProps = {
  searchParams: Promise<{ username?: string | string[] | undefined; sample?: string | string[] | undefined }>;
};

export const metadata = {
  title: "Free Chess Trial | Pablo",
  description:
    "Try Pablo free with a sample game or import your latest Chess.com games before paying.",
};

const SAMPLE_GAME: ImportedChessComGame = {
  url: null,
  pgn: `[Event "Sample Pablo Trial"]
[Site "Pablo Demo"]
[Date "2026.04.12"]
[Round "1"]
[White "Pablo Trial User"]
[Black "Training Bot"]
[Result "0-1"]
[WhiteElo "1180"]
[BlackElo "1450"]
[TimeControl "600"]
[Termination "Training Bot won by checkmate"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4 4. Nxe5 Qg5 5. Bxf7+ Kd8 6. O-O Qxe5 7. Bxg8 Rxg8
8. d3 Bd6 9. f4 Qc5 10. Be3 Qxc2 11. Bxd4 Qxd1 12. Rxd1 Bxf4 13. Nc3 c6 14. Rf1
Bd6 15. e5 Be7 16. Rf7 Ke8 17. Raf1 b6 18. Ne4 Ba6 19. Nd6+ Bxd6 20. exd6 Bxd3
21. Re7+ Kd8 22. Rff7 Bg6 23. Rxd7+ Kc8 24. Rc7+ Kb8 25. Rb7+ Kc8 26. Rfc7+ Kd8
27. Bxg7 Re8 28. Bf6+ Re7 29. Rxe7 Kc8 30. Rbc7+ Kb8 31. d7 Kxc7 32. d8=Q# 0-1`,
  opponent: "Training Bot",
  opponentRating: 1450,
  date: "2026-04-12T18:00:00.000Z",
  result: "loss",
  resultDetail: "checkmated",
  color: "white",
  timeClass: "rapid",
  timeControl: "10m",
  rated: false,
  rules: "chess",
};

function formatDate(value: string | null) {
  if (!value) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatResult(result: ImportedChessComGame["result"]) {
  if (result === "win") {
    return "Win";
  }

  if (result === "draw") {
    return "Draw";
  }

  return "Loss";
}

function resultStyles(result: ImportedChessComGame["result"]) {
  if (result === "win") {
    return {
      borderColor: "rgba(75, 181, 122, 0.28)",
      color: "#8ce0ac",
      background: "rgba(75, 181, 122, 0.08)",
    };
  }

  if (result === "draw") {
    return {
      borderColor: "rgba(201, 168, 76, 0.28)",
      color: "#e8c870",
      background: "rgba(201, 168, 76, 0.08)",
    };
  }

  return {
    borderColor: "rgba(224, 97, 97, 0.28)",
    color: "#ff9a9a",
    background: "rgba(224, 97, 97, 0.08)",
  };
}

function normalizeParam(value: string | string[] | undefined) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }

  return "";
}

export default async function AnalyzePage({ searchParams }: AnalyzePageProps) {
  const resolvedSearchParams = await searchParams;
  const username = normalizeParam(resolvedSearchParams.username);
  const sample = normalizeParam(resolvedSearchParams.sample);
  const usingSampleGame = sample === "1";

  let games: ImportedChessComGame[] = usingSampleGame ? [SAMPLE_GAME] : [];
  let archive = usingSampleGame ? "Pablo sample game" : "";
  let errorMessage = "";

  if (username && !usingSampleGame) {
    try {
      const result = await importRecentChessComGames(username);
      games = result.games;
      archive = result.archive;
    } catch (error) {
      if (error instanceof ChessComImportError) {
        errorMessage = error.message;
      } else {
        errorMessage = "Something went wrong while importing games.";
      }
    }
  }

  return (
    <main
      className="min-h-screen px-6 py-10 sm:px-8 lg:px-12"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p
              className="mb-3 text-xs font-bold tracking-[0.35em] uppercase"
              style={{ color: "var(--gold)" }}
            >
              Pablo Free Trial
            </p>
            <h1
              className="text-4xl font-bold tracking-tight sm:text-5xl"
              style={{ fontFamily: "var(--font-playfair), serif" }}
            >
              See the coaching before you pay.
            </h1>
            <p
              className="mt-4 max-w-3xl text-base leading-7"
              style={{ color: "var(--text-secondary)" }}
            >
              First-time users can start in two low-friction ways: import a public Chess.com
              game history or open a sample game instantly. Pablo generates one free coaching
              preview first, then introduces payment only after the report appears.
            </p>
          </div>

          <Link
            href="/"
            className="hidden rounded-full border px-4 py-2 text-sm font-medium transition-colors sm:inline-flex"
            style={{
              borderColor: "var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            Back Home
          </Link>
        </div>

        <section
          className="rounded-[2rem] border p-6 sm:p-8"
          style={{
            background:
              "linear-gradient(135deg, rgba(17,19,22,0.94), rgba(10,11,12,0.98))",
            borderColor: "var(--border)",
            boxShadow: "0 32px 90px rgba(0, 0, 0, 0.35)",
          }}
        >
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <p
                  className="text-xs font-bold tracking-[0.28em] uppercase"
                  style={{ color: "var(--text-muted)" }}
                >
                  Start free
                </p>
                <h2
                  className="text-2xl font-bold sm:text-3xl"
                  style={{ fontFamily: "var(--font-playfair), serif" }}
                >
                  Choose the fastest path to your first report.
                </h2>
                <p className="max-w-2xl text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                  No signup wall, no card upfront. Just get to a useful report and decide after
                  you have seen your mistakes called out.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Form action="" className="rounded-[1.5rem] border p-5" style={{
                  borderColor: "rgba(201,168,76,0.14)",
                  background: "rgba(10, 11, 12, 0.72)",
                }}>
                  <div className="flex h-full flex-col gap-4">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        Import a real game
                      </p>
                      <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                        Paste a public Chess.com username. Pablo pulls up to 10 recent games and
                        lets you generate one free preview report on any of them.
                      </p>
                    </div>

                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                        Chess.com username
                      </span>
                      <input
                        type="text"
                        name="username"
                        defaultValue={username}
                        placeholder="hikaru"
                        autoComplete="off"
                        className="min-h-14 rounded-2xl border px-4 text-base outline-none transition"
                        style={{
                          borderColor: "var(--border)",
                          background: "rgba(10, 11, 12, 0.88)",
                          color: "var(--text-primary)",
                        }}
                      />
                    </label>

                    <button
                      type="submit"
                      className="btn-gold mt-auto min-h-14 rounded-2xl px-6 text-base font-bold"
                      style={{ color: "#0a0b0c" }}
                    >
                      Import Games
                    </button>
                  </div>
                </Form>

                <div className="rounded-[1.5rem] border p-5" style={{
                  borderColor: "rgba(201,168,76,0.14)",
                  background: "rgba(10, 11, 12, 0.72)",
                }}>
                  <div className="flex h-full flex-col gap-4">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        Use a sample game
                      </p>
                      <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                        Don&apos;t have a username ready? Open a preloaded game and experience the full
                        import-to-report flow in one click.
                      </p>
                    </div>

                    <ul className="grid gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                      <li>• Instant demo, no external dependency</li>
                      <li>• Same report UI as a real imported game</li>
                      <li>• Payment only appears after the analysis output</li>
                    </ul>

                    <Link
                      href="/analyze?sample=1"
                      className="btn-gold mt-auto inline-flex min-h-14 items-center justify-center rounded-2xl px-6 text-base font-bold"
                      style={{ color: "#0a0b0c" }}
                    >
                      Try Sample Game
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="rounded-[1.5rem] border p-5"
              style={{
                borderColor: "rgba(201,168,76,0.14)",
                background: "rgba(201,168,76,0.05)",
              }}
            >
              <p
                className="text-xs font-bold tracking-[0.24em] uppercase"
                style={{ color: "var(--gold)" }}
              >
                Recommended gating
              </p>
              <div className="mt-4 grid gap-4 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                <div>
                  <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    1. Let the user reach value first
                  </p>
                  <p>Keep the first action fully free: import or sample game, then one visible report.</p>
                </div>
                <div>
                  <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    2. Gate depth, not the initial outcome
                  </p>
                  <p>Show summary + first flagged moment. Hide the rest of the blunder list and cross-game pattern work until upgrade.</p>
                </div>
                <div>
                  <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    3. Ask for payment only after proof
                  </p>
                  <p>Trigger the upgrade panel inline under the report, where intent is highest.</p>
                </div>
                <div>
                  <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    4. Next technical step
                  </p>
                  <p>Persist trial state server-side so each visitor gets one free full preview before the paywall follows them across devices.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {errorMessage ? (
          <section
            className="rounded-[1.75rem] border p-6"
            style={{
              borderColor: "rgba(224,97,97,0.28)",
              background: "rgba(77, 17, 17, 0.45)",
            }}
          >
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-red-300">
              Import failed
            </p>
            <p className="mt-3 text-base leading-7 text-red-100">{errorMessage}</p>
          </section>
        ) : null}

        {games.length > 0 ? (
          <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p
                  className="text-xs font-bold tracking-[0.28em] uppercase"
                  style={{ color: "var(--text-muted)" }}
                >
                  {usingSampleGame ? "Sample Demo" : "Imported Games"}
                </p>
                <h2
                  className="text-2xl font-bold"
                  style={{ fontFamily: "var(--font-playfair), serif" }}
                >
                  {usingSampleGame ? "Your instant trial report is ready to generate." : `${games.length} recent games for ${username}`}
                </h2>
              </div>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Source: {archive}
              </p>
            </div>

            <div className="grid gap-4">
              {games.map((game, index) => {
                const badgeStyles = resultStyles(game.result);

                return (
                  <article
                    key={`${game.url ?? game.date ?? index}-${index}`}
                    className="rounded-[1.75rem] border p-5 sm:p-6"
                    style={{
                      borderColor: "var(--border)",
                      background:
                        "linear-gradient(180deg, rgba(22,26,31,0.88), rgba(14,16,19,0.98))",
                    }}
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]"
                              style={badgeStyles}
                            >
                              {formatResult(game.result)}
                            </span>
                            <span
                              className="rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]"
                              style={{
                                borderColor: "rgba(201,168,76,0.16)",
                                color: "var(--text-secondary)",
                              }}
                            >
                              {game.color}
                            </span>
                            <span
                              className="rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]"
                              style={{
                                borderColor: "rgba(201,168,76,0.16)",
                                color: "var(--text-secondary)",
                              }}
                            >
                              {game.timeClass ?? "unknown speed"}
                            </span>
                          </div>

                          <div>
                            <h3 className="text-xl font-semibold">
                              vs {game.opponent}
                              {game.opponentRating ? ` (${game.opponentRating})` : ""}
                            </h3>
                            <p
                              className="mt-1 text-sm leading-6"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {formatDate(game.date)} · {game.timeControl ?? "Unknown time control"} ·{" "}
                              {game.rated ? "Rated" : "Unrated"} · {game.rules ?? "chess"}
                            </p>
                          </div>
                        </div>

                        {game.url ? (
                          <Link
                            href={game.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex rounded-full border px-4 py-2 text-sm font-medium transition-colors"
                            style={{
                              borderColor: "var(--border)",
                              color: "var(--text-secondary)",
                            }}
                          >
                            Open on Chess.com
                          </Link>
                        ) : null}
                      </div>

                      <GameAnalysisCard
                        pgn={game.pgn}
                        perspective={game.color}
                        isTrial
                      />

                      <details
                        className="rounded-2xl border"
                        style={{
                          borderColor: "rgba(201,168,76,0.12)",
                          background: "rgba(10,11,12,0.72)",
                        }}
                      >
                        <summary
                          className="cursor-pointer list-none px-4 py-3 text-sm font-semibold"
                          style={{ color: "var(--gold-light)" }}
                        >
                          View PGN
                        </summary>
                        <pre
                          className="overflow-x-auto border-t px-4 py-4 text-xs leading-6 whitespace-pre-wrap"
                          style={{
                            borderColor: "rgba(201,168,76,0.1)",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {game.pgn}
                        </pre>
                      </details>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : username && !errorMessage ? (
          <section
            className="rounded-[1.75rem] border p-6"
            style={{
              borderColor: "var(--border)",
              background: "rgba(17,19,22,0.85)",
            }}
          >
            <p style={{ color: "var(--text-secondary)" }}>
              No games were returned.
            </p>
          </section>
        ) : (
          <section
            className="rounded-[1.75rem] border p-6"
            style={{
              borderColor: "var(--border)",
              background: "rgba(17,19,22,0.85)",
            }}
          >
            <p
              className="text-xs font-bold uppercase tracking-[0.24em]"
              style={{ color: "var(--text-muted)" }}
            >
              Recommended first-use UX
            </p>
            <div className="mt-3 grid gap-3 max-w-3xl text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
              <p>• Make the landing page CTA point to the free trial, not checkout.</p>
              <p>• Offer sample-game fallback so nobody bounces when they do not know their username.</p>
              <p>• Show one real coaching insight before the upgrade ask.</p>
              <p>• Gate full depth, pattern history, and ongoing monitoring instead of gating the first result.</p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
