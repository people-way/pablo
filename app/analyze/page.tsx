import Form from "next/form";
import Link from "next/link";
import {
  ChessComImportError,
  importRecentChessComGames,
  type ImportedChessComGame,
} from "@/lib/chess-com";

type AnalyzePageProps = {
  searchParams: Promise<{ username?: string | string[] | undefined }>;
};

export const metadata = {
  title: "Analyze Recent Games | Pablo",
  description:
    "Import your most recent Chess.com games and inspect the raw game history Pablo will analyze next.",
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

export default async function AnalyzePage({ searchParams }: AnalyzePageProps) {
  const resolvedSearchParams = await searchParams;
  const usernameParam = resolvedSearchParams.username;
  const username =
    typeof usernameParam === "string"
      ? usernameParam.trim()
      : Array.isArray(usernameParam)
        ? usernameParam[0]?.trim() ?? ""
        : "";

  let games: ImportedChessComGame[] = [];
  let archive = "";
  let errorMessage = "";

  if (username) {
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
              Pablo Intake
            </p>
            <h1
              className="text-4xl font-bold tracking-tight sm:text-5xl"
              style={{ fontFamily: "var(--font-playfair), serif" }}
            >
              Import your last Chess.com games.
            </h1>
            <p
              className="mt-4 max-w-2xl text-base leading-7"
              style={{ color: "var(--text-secondary)" }}
            >
              Start with a public username. Pablo pulls the latest archive month,
              keeps the 10 most recent games, and exposes the PGNs and metadata
              needed for analysis.
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
          className="relative overflow-hidden rounded-[2rem] border p-6 sm:p-8"
          style={{
            background:
              "linear-gradient(135deg, rgba(17,19,22,0.94), rgba(10,11,12,0.98))",
            borderColor: "var(--border)",
            boxShadow: "0 32px 90px rgba(0, 0, 0, 0.35)",
          }}
        >
          <div className="pointer-events-none absolute inset-0 chess-pattern opacity-60" />
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)",
            }}
          />

          <div className="relative flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <p
                className="text-xs font-bold tracking-[0.28em] uppercase"
                style={{ color: "var(--text-muted)" }}
              >
                Source
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="rounded-full border px-3 py-1 text-sm font-semibold"
                  style={{
                    borderColor: "rgba(201,168,76,0.24)",
                    color: "var(--gold-light)",
                    background: "rgba(201,168,76,0.08)",
                  }}
                >
                  Chess.com public API
                </span>
                <span
                  className="text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Latest archive month only, capped at 10 games.
                </span>
              </div>
            </div>

            <Form action="" className="flex flex-col gap-4 lg:flex-row lg:items-end">
              <label className="flex flex-1 flex-col gap-2">
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
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
                className="btn-gold min-h-14 rounded-2xl px-6 text-base font-bold"
                style={{ color: "#0a0b0c" }}
              >
                Import Games
              </button>
            </Form>

            <div
              className="rounded-2xl border px-4 py-3 text-sm"
              style={{
                borderColor: "rgba(201,168,76,0.14)",
                background: "rgba(201,168,76,0.05)",
                color: "var(--text-secondary)",
              }}
            >
              API endpoint: <code>/api/import/chess-com?username=your-name</code>
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
                  Imported Games
                </p>
                <h2
                  className="text-2xl font-bold"
                  style={{ fontFamily: "var(--font-playfair), serif" }}
                >
                  {games.length} recent games for {username}
                </h2>
              </div>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Archive month: {archive}
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
              Ready
            </p>
            <p className="mt-3 max-w-2xl leading-7" style={{ color: "var(--text-secondary)" }}>
              Enter a public Chess.com username to pull the latest monthly archive.
              The next task can analyze these PGNs with an engine and start
              clustering mistake patterns.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
