"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { analyzeGame, ReviewCancelled } from "@/lib/review/analyze-game";
import { classLabel, summarizePlayer, summaryText } from "@/lib/review/classify";
import { buildCoachingSession } from "@/lib/review/session";
import { ReviewEngine, type EngineSearch } from "@/lib/review/engine-client";
import { parseFen, parsePgn, parsePgnCollection, ReviewInputError, sanLine } from "@/lib/review/parse";
import { SAMPLE_PGN } from "@/lib/review/sample";
import { formatCentipawnLoss, formatEval, sideToMove, toWhiteView } from "@/lib/review/scores";
import { readSaved, removeSaved, upsertSaved } from "@/lib/review/storage";
import type { MoveAnalysis, NodeEval, ParsedGame, PgnDocument, SavedReview, Side } from "@/lib/review/types";
import { ChessBoard } from "./board";
import { CoachPanel } from "./coach-panel";
import { classColor, EvalBar, EvalChart, MoveList } from "./widgets";

const DEPTHS = [8, 10, 12, 14, 16];
const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

type Tab = "pgn" | "chesscom" | "fen" | "saved";

type Loaded =
  | { kind: "idle" }
  | { kind: "game"; game: ParsedGame; pgn: string; viewer: Side | null }
  | { kind: "position"; fen: string };

type ExploreMove = { san: string; uci: string; fen: string };
type Explore = { rootFen: string; moves: ExploreMove[]; cursor: number };

type PublicGame = {
  id: string;
  pgn: string;
  white: string;
  black: string;
  whiteRating: number | null;
  blackRating: number | null;
  result: string;
  endTime: number | null;
  timeClass: string | null;
  timeControl: string | null;
};

type Batch = { done: number; total: number; depthNow: number };

export function RevueApp() {
  const engineRef = useRef<ReviewEngine | null>(null);
  const batchAbort = useRef<AbortController | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [tab, setTab] = useState<Tab>("pgn");
  const [pgnText, setPgnText] = useState("");
  const [fenText, setFenText] = useState("");
  const [username, setUsername] = useState("");
  const [remoteGames, setRemoteGames] = useState<PublicGame[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [loaded, setLoaded] = useState<Loaded>({ kind: "idle" });
  const [ply, setPly] = useState(0);
  const [explore, setExplore] = useState<Explore | null>(null);
  const [orientation, setOrientation] = useState<Side>("w");
  const [depth, setDepth] = useState(16);
  const [analyses, setAnalyses] = useState<Array<MoveAnalysis | null>>([]);
  const [nodeEvals, setNodeEvals] = useState<Array<NodeEval | null>>([]);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [live, setLive] = useState<{ fen: string; search: EngineSearch } | null>(null);
  const [saved, setSaved] = useState<SavedReview[]>([]);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pgnChoices, setPgnChoices] = useState<PgnDocument[]>([]);
  const boardAnchor = useRef<HTMLElement | null>(null);
  const liveStamp = useRef(0);

  useEffect(() => {
    const engine = new ReviewEngine();
    engineRef.current = engine;
    let alive = true;

    engine.ready
      .then(() => {
        if (alive) {
          setEngineReady(true);
        }
      })
      .catch((error: unknown) => {
        if (alive) {
          setMessage(error instanceof Error ? error.message : "Le moteur n'a pas démarré.");
        }
      });

    return () => {
      alive = false;
      batchAbort.current?.abort();
      engine.dispose();
      if (engineRef.current === engine) {
        engineRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setSaved(readSaved(window.localStorage));
  }, []);

  const displayedFen = useMemo(() => viewFen(loaded, ply, explore), [loaded, ply, explore]);
  const game = loaded.kind === "game" ? loaded.game : null;
  const liveEnabled = loaded.kind !== "idle" && !batch;

  useEffect(() => {
    if (!engineReady || !liveEnabled) {
      return;
    }

    const engine = engineRef.current;

    if (!engine) {
      return;
    }

    const controller = new AbortController();
    const fen = displayedFen;
    const timer = window.setTimeout(() => {
      engine
        .search({
          fen,
          depth,
          multipv: 3,
          signal: controller.signal,
          onProgress: (partial) => {
            if (controller.signal.aborted) {
              return;
            }

            const now = performance.now();

            if (now - liveStamp.current < 80 && partial.depth < depth) {
              return;
            }

            liveStamp.current = now;
            setLive({ fen, search: partial });
          },
        })
        .then((result) => {
          if (!controller.signal.aborted) {
            setLive({ fen, search: result });
          }
        })
        .catch((error: unknown) => {
          if (!isAbort(error) && !controller.signal.aborted) {
            setMessage(error instanceof Error ? error.message : "L'évaluation a échoué.");
          }
        });
    }, 80);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [engineReady, liveEnabled, displayedFen, depth]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;

      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
      } else if (event.key === "Home") {
        event.preventDefault();
        exitExplore();
        setPly(0);
      } else if (event.key === "End" && game) {
        event.preventDefault();
        exitExplore();
        setPly(game.moves.length);
      } else if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        setOrientation((side) => (side === "w" ? "b" : "w"));
      }
    }

    function step(direction: number) {
      if (explore) {
        setExplore((current) => {
          if (!current) {
            return current;
          }

          const next = current.cursor + direction;

          if (next < 0) {
            return null;
          }

          if (next > current.moves.length) {
            return current;
          }

          return { ...current, cursor: next };
        });
        return;
      }

      if (!game) {
        return;
      }

      setPly((current) => Math.min(game.moves.length, Math.max(0, current + direction)));
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [explore, game]);

  function exitExplore() {
    setExplore(null);
    setLive(null);
  }

  function revealBoard() {
    const active = document.activeElement;

    if (active instanceof HTMLElement && active !== document.body) {
      active.blur();
    }

    window.requestAnimationFrame(() => {
      boardAnchor.current?.scrollIntoView({ block: "start" });
    });
  }

  function openGame(pgn: string, viewer: Side | null) {
    batchAbort.current?.abort();
    const parsed = parsePgn(pgn);
    setLoaded({ kind: "game", game: parsed, pgn, viewer });
    setPly(0);
    setExplore(null);
    setLive(null);
    setAnalyses(Array.from({ length: parsed.moves.length }, () => null));
    setNodeEvals(Array.from({ length: parsed.moves.length + 1 }, () => null));
    setOrientation(viewer ?? "w");
    setSavedId(null);
    setMessage(null);
    revealBoard();
  }

  function openPosition(rawFen: string) {
    batchAbort.current?.abort();
    const fen = parseFen(rawFen);
    setLoaded({ kind: "position", fen });
    setPly(0);
    setExplore({ rootFen: fen, moves: [], cursor: 0 });
    setLive(null);
    setAnalyses([]);
    setNodeEvals([]);
    setSavedId(null);
    setOrientation(sideToMove(fen) === "b" ? "b" : "w");
    setMessage(null);
    revealBoard();
  }

  function openPgn(raw: string, viewer: Side | null) {
    const collection = parsePgnCollection(raw);

    if (collection.games.length > 1) {
      setPgnChoices(collection.games);
      setMessage(
        collection.skipped > 0
          ? `${collection.games.length} parties lisibles, ${collection.skipped} ignorée${collection.skipped > 1 ? "s" : ""}. Choisis laquelle ouvrir.`
          : `${collection.games.length} parties trouvées. Choisis laquelle ouvrir.`,
      );
      return;
    }

    setPgnChoices([]);
    const only = collection.games[0];
    openGame(only.pgn, viewer);
    const notes: string[] = [];

    if (only.game.hasVariations) {
      notes.push("Ligne principale ouverte. Les variantes entre parenthèses ne sont pas rejouées.");
    }

    if (collection.skipped > 0) {
      notes.push(
        collection.skipped > 1
          ? `${collection.skipped} parties illisibles ont été ignorées.`
          : "Une partie illisible a été ignorée.",
      );
    }

    if (notes.length > 0) {
      setMessage(notes.join(" "));
    }
  }

  function followLine(uciMoves: string[]) {
    if (batch) {
      return;
    }

    const fen = displayedFen;
    const chess = new Chess(fen);
    const played: ExploreMove[] = [];

    for (const uci of uciMoves) {
      try {
        const move = chess.move({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci[4],
        });
        played.push({ san: move.san, uci, fen: move.after });
      } catch {
        break;
      }
    }

    if (played.length === 0) {
      return;
    }

    setExplore((current) => {
      const base = current ?? { rootFen: fen, moves: [], cursor: 0 };
      const prefix = base.moves.slice(0, base.cursor);
      return {
        rootFen: base.rootFen,
        moves: [...prefix, ...played],
        cursor: prefix.length + 1,
      };
    });
  }

  function playUci(uci: string) {
    if (batch) {
      return;
    }

    const fen = displayedFen;
    const chess = new Chess(fen);

    let move;

    try {
      move = chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci[4],
      });
    } catch {
      return;
    }

    setExplore((current) => {
      const base = current ?? { rootFen: fen, moves: [], cursor: 0 };
      const moves = base.moves.slice(0, base.cursor);
      moves.push({ san: move.san, uci, fen: move.after });
      return { rootFen: base.rootFen, moves, cursor: moves.length };
    });
  }

  async function runAnalysis() {
    const engine = engineRef.current;

    if (!game || !engine || batch) {
      return;
    }

    const controller = new AbortController();
    batchAbort.current = controller;
    exitExplore();
    setMessage(null);
    setBatch({ done: 0, total: game.moves.length + 1, depthNow: 0 });

    try {
      const result = await analyzeGame({
        startFen: game.startFen,
        moves: game.moves,
        shouldStop: () => controller.signal.aborted,
        search: async (fen) => {
          const found = await engine.search({
            fen,
            depth,
            multipv: 1,
            signal: controller.signal,
            onProgress: (partial) => {
              setBatch((current) => (current ? { ...current, depthNow: partial.depth } : current));
            },
          });
          const main = found.lines[0];

          return {
            bestUci: found.bestUci,
            cp: main?.cp ?? null,
            mate: main?.mate ?? null,
            pvUci: main?.pvUci?.length ? main.pvUci : found.bestUci ? [found.bestUci] : [],
          };
        },
        onProgress: (update) => {
          setAnalyses(update.analyses);
          setNodeEvals(update.nodeEvals);
          setBatch((current) =>
            current ? { ...current, done: update.done, total: update.total } : current,
          );
        },
      });
      setAnalyses(result.analyses);
      setNodeEvals(result.nodeEvals);
      setMessage("Analyse terminée.");
    } catch (error) {
      if (isAbort(error)) {
        setMessage("Analyse arrêtée. Les coups déjà calculés restent affichés.");
      } else {
        setMessage(error instanceof Error ? error.message : "L'analyse a échoué.");
      }
    } finally {
      if (batchAbort.current === controller) {
        batchAbort.current = null;
        setBatch(null);
      }
    }
  }

  function stopAnalysis() {
    batchAbort.current?.abort();
  }

  async function loadChessCom(event: React.FormEvent) {
    event.preventDefault();
    const name = username.trim();

    if (!name) {
      setMessage("Indique un pseudo Chess.com.");
      return;
    }

    setRemoteLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/revue/chess-com?username=${encodeURIComponent(name)}`);
      const payload = (await response.json()) as { games?: PublicGame[]; error?: string };

      if (!response.ok || !payload.games) {
        throw new Error(payload.error || "Impossible de lire les parties.");
      }

      setRemoteGames(payload.games);
      if (payload.games.length === 0) {
        setMessage("Aucune partie récente.");
      }
    } catch (error) {
      setRemoteGames([]);
      setMessage(error instanceof Error ? error.message : "Chess.com est injoignable.");
    } finally {
      setRemoteLoading(false);
    }
  }

  function saveReview() {
    if (loaded.kind === "idle") {
      return;
    }

    const id = savedId ?? crypto.randomUUID();
    const white = game?.white ?? "Position";
    const black = game?.black ?? "";
    const review: SavedReview = {
      id,
      savedAt: new Date().toISOString(),
      title: game ? `${game.white} – ${game.black}` : "Position",
      white,
      black,
      result: game?.result ?? "*",
      date: game?.date ?? "",
      pgn: loaded.kind === "game" ? loaded.pgn : null,
      fen: loaded.kind === "position" ? loaded.fen : explore?.rootFen ?? null,
      depth,
      ply,
      viewer: loaded.kind === "game" ? loaded.viewer : null,
      analyses,
      nodeEvals,
    };

    try {
      setSaved(upsertSaved(window.localStorage, review));
      setSavedId(id);
      setMessage("Enregistré sur cet appareil.");
    } catch {
      setMessage("La sauvegarde locale a échoué (espace plein).");
    }
  }

  function openSaved(review: SavedReview) {
    try {
      if (review.pgn) {
        openGame(review.pgn, review.viewer);
        const parsed = parsePgn(review.pgn);
        setPly(Math.min(review.ply, parsed.moves.length));
        setDepth(review.depth || 16);
        setAnalyses(
          review.analyses.length === parsed.moves.length
            ? review.analyses
            : Array.from({ length: parsed.moves.length }, () => null),
        );
        setNodeEvals(
          review.nodeEvals.length === parsed.moves.length + 1
            ? review.nodeEvals
            : Array.from({ length: parsed.moves.length + 1 }, () => null),
        );
        setSavedId(review.id);
      } else if (review.fen) {
        openPosition(review.fen);
        setDepth(review.depth || 16);
        setSavedId(review.id);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Cette sauvegarde est illisible.");
    }
  }

  function deleteSaved(id: string) {
    setSaved(removeSaved(window.localStorage, id));
    if (savedId === id) {
      setSavedId(null);
    }
    setPendingDelete(null);
  }

  const doneMoves = analyses.filter((item): item is MoveAnalysis => item != null);
  const whiteSummary = summarizePlayer(doneMoves, "w");
  const blackSummary = summarizePlayer(doneMoves, "b");
  const viewer = loaded.kind === "game" ? loaded.viewer : null;
  const session = useMemo(() => {
    if (!game) {
      return null;
    }

    return buildCoachingSession({
      moves: game.moves,
      analyses,
      openingHeader: game.opening,
      result: game.result,
      viewer,
    });
  }, [game, analyses, viewer]);
  const currentAnalysis = game && !explore && ply > 0 ? analyses[ply - 1] : null;
  const currentNote = session && !explore && ply > 0 ? session.notes[ply - 1] : null;
  const currentLive = live?.fen === displayedFen ? live.search : null;
  const storedEval = game && !explore ? nodeEvals[ply] ?? null : null;
  const barEval = liveEval(displayedFen, currentLive) ?? storedEval;
  const hintUci =
    currentLive?.lines[0]?.pvUci[0] ??
    (!explore && game ? analyses[ply]?.bestUci ?? null : null);
  const positionComment = explore
    ? ""
    : game
      ? ply === 0
        ? game.startComment
        : game.moves[ply - 1]?.comment ?? ""
      : "";
  const lastMove = lastSquares(loaded, ply, explore);
  const progress = batch ? Math.round((batch.done / batch.total) * 100) : 0;

  return (
    <main className="min-h-screen px-3 py-4 sm:px-6" style={{ background: "var(--bg-primary)" }}>
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/" className="text-sm" style={{ color: "var(--text-muted)" }}>
              ← Pablo
            </Link>
            <h1
              className="text-3xl"
              style={{ fontFamily: "var(--font-playfair), serif", color: "var(--gold-light)" }}
            >
              Revue
            </h1>
          </div>
          <p className="text-sm" style={{ color: engineReady ? "var(--text-secondary)" : "var(--gold)" }}>
            {engineReady ? "Stockfish prêt, dans le navigateur" : "Chargement du moteur…"}
          </p>
        </header>

        <section
          className="rounded-2xl p-3 sm:p-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div className="mb-3 flex flex-wrap gap-2">
            {(
              [
                ["pgn", "PGN"],
                ["chesscom", "Chess.com"],
                ["fen", "Position FEN"],
                ["saved", "Sauvegardes"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className="min-h-11 rounded-lg px-3 text-sm font-semibold"
                style={{
                  background: tab === id ? "var(--gold)" : "transparent",
                  color: tab === id ? "#0a0b0c" : "var(--text-secondary)",
                  border: "1px solid var(--border)",
                }}
              >
                {label}
                {id === "saved" && saved.length > 0 ? ` (${saved.length})` : ""}
              </button>
            ))}
          </div>

          {tab === "pgn" ? (
            <form
              className="flex flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                try {
                  openPgn(pgnText, null);
                } catch (error) {
                  setMessage(error instanceof ReviewInputError ? error.message : "PGN illisible.");
                }
              }}
            >
              <textarea
                id="pgn-input"
                value={pgnText}
                onChange={(event) => setPgnText(event.target.value)}
                rows={6}
                placeholder="Colle le PGN d'une partie"
                className="w-full rounded-xl p-3 text-sm"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
              <div className="flex flex-wrap gap-2">
                <button type="submit" className="btn-gold min-h-11 rounded-lg px-4 text-sm font-bold" style={{ color: "#0a0b0c" }}>
                  Ouvrir la partie
                </button>
                <button
                  type="button"
                  className="min-h-11 rounded-lg px-4 text-sm"
                  style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                  onClick={() => {
                    setPgnText(SAMPLE_PGN);
                    try {
                      openGame(SAMPLE_PGN, "w");
                    } catch (error) {
                      setMessage(error instanceof Error ? error.message : "PGN illisible.");
                    }
                  }}
                >
                  Partie exemple
                </button>
              </div>
              {pgnChoices.length > 1 ? (
                <ul className="flex flex-col gap-2">
                  {pgnChoices.map((choice, index) => (
                    <li key={`${choice.game.white}-${choice.game.black}-${choice.game.date}-${index}`}>
                      <button
                        type="button"
                        className="flex w-full min-h-11 flex-col rounded-lg px-3 py-2 text-left text-sm sm:flex-row sm:items-center sm:justify-between"
                        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
                        onClick={() => {
                          openGame(choice.pgn, null);
                          if (choice.game.hasVariations) {
                            setMessage("Ligne principale ouverte. Les variantes entre parenthèses ne sont pas rejouées.");
                          }
                        }}
                      >
                        <span>
                          {choice.game.white} – {choice.game.black}
                        </span>
                        <span style={{ color: "var(--text-muted)" }}>
                          {choice.game.result} · {choice.game.moves.length} coups
                          {choice.game.date ? ` · ${choice.game.date}` : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </form>
          ) : null}

          {tab === "chesscom" ? (
            <form className="flex flex-col gap-3" onSubmit={loadChessCom}>
              <label className="text-sm" style={{ color: "var(--text-secondary)" }} htmlFor="username-input">
                Pseudo Chess.com
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="username-input"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="hikaru"
                  autoCapitalize="off"
                  autoCorrect="off"
                  className="min-h-11 flex-1 rounded-lg px-3 text-sm"
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
                />
                <button
                  type="submit"
                  disabled={remoteLoading}
                  className="btn-gold min-h-11 rounded-lg px-4 text-sm font-bold disabled:opacity-60"
                  style={{ color: "#0a0b0c" }}
                >
                  {remoteLoading ? "Chargement…" : "Parties récentes"}
                </button>
              </div>
              <ul className="flex flex-col gap-2">
                {remoteGames.map((remote) => (
                  <li key={remote.id}>
                    <button
                      type="button"
                      className="flex w-full min-h-11 flex-col rounded-lg px-3 py-2 text-left text-sm sm:flex-row sm:items-center sm:justify-between"
                      style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
                      onClick={() => {
                        const viewer = viewerFor(username, remote.white, remote.black);
                        try {
                          openGame(remote.pgn, viewer);
                        } catch (error) {
                          setMessage(error instanceof Error ? error.message : "PGN illisible.");
                        }
                      }}
                    >
                      <span>
                        {remote.white} ({remote.whiteRating ?? "?"}) – {remote.black} ({remote.blackRating ?? "?"})
                      </span>
                      <span style={{ color: "var(--text-muted)" }}>
                        {labelTime(remote.timeClass)} · {remote.result} · {formatEnd(remote.endTime)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </form>
          ) : null}

          {tab === "fen" ? (
            <form
              className="flex flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                try {
                  openPosition(fenText);
                } catch (error) {
                  setMessage(error instanceof ReviewInputError ? error.message : "FEN illisible.");
                }
              }}
            >
              <textarea
                id="fen-input"
                value={fenText}
                onChange={(event) => setFenText(event.target.value)}
                rows={3}
                placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                className="w-full rounded-xl p-3 text-sm"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
              />
              <button type="submit" className="btn-gold min-h-11 w-fit rounded-lg px-4 text-sm font-bold" style={{ color: "#0a0b0c" }}>
                Ouvrir la position
              </button>
            </form>
          ) : null}

          {tab === "saved" ? (
            <ul className="flex flex-col gap-2">
              {saved.length === 0 ? (
                <li className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Aucune partie enregistrée sur cet appareil.
                </li>
              ) : (
                saved.map((review) => (
                  <li
                    key={review.id}
                    className="flex flex-col gap-2 rounded-lg px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                    style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
                  >
                    <button type="button" className="min-h-11 text-left text-sm" onClick={() => openSaved(review)}>
                      <span className="font-semibold">{review.title}</span>
                      <span className="mt-1 block" style={{ color: "var(--text-muted)" }}>
                        {review.result} · profondeur {review.depth}
                        {analyzedCount(review) > 0 ? ` · ${analyzedCount(review)} coups analysés` : " · sans analyse"}
                        {review.savedAt ? ` · ${formatSaved(review.savedAt)}` : ""}
                      </span>
                    </button>
                    {pendingDelete === review.id ? (
                      <span className="flex gap-2">
                        <button
                          type="button"
                          className="min-h-11 rounded-lg px-3 text-sm font-semibold"
                          style={{ color: "#e85555" }}
                          onClick={() => deleteSaved(review.id)}
                        >
                          Confirmer
                        </button>
                        <button
                          type="button"
                          className="min-h-11 rounded-lg px-3 text-sm"
                          style={{ color: "var(--text-secondary)" }}
                          onClick={() => setPendingDelete(null)}
                        >
                          Annuler
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="min-h-11 rounded-lg px-3 text-sm"
                        style={{ color: "var(--text-secondary)" }}
                        onClick={() => setPendingDelete(review.id)}
                      >
                        Supprimer
                      </button>
                    )}
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </section>

        {message ? (
          <p className="text-sm" role="status" style={{ color: "var(--gold-light)" }}>
            {message}
          </p>
        ) : null}

        <section ref={boardAnchor} className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex min-w-0 gap-2">
              <EvalBar evaluation={barEval} orientation={orientation} />
              <div className="min-w-0 flex-1">
                <ChessBoard
                  fen={displayedFen}
                  orientation={orientation}
                  lastMove={lastMove}
                  bestMove={batch ? null : hintUci}
                  interactive={!batch}
                  onPlay={playUci}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <NavButton label="Début" onClick={() => { exitExplore(); setPly(0); }} />
              <NavButton label="Précédent" onClick={() => (explore ? setExplore((current) => shiftExplore(current, -1)) : setPly((current) => Math.max(0, current - 1)))} />
              <NavButton
                label="Suivant"
                onClick={() =>
                  explore
                    ? setExplore((current) => shiftExplore(current, 1))
                    : setPly((current) => (game ? Math.min(game.moves.length, current + 1) : current))
                }
              />
              <NavButton label="Fin" onClick={() => { exitExplore(); if (game) setPly(game.moves.length); }} />
              <NavButton label="Retourner" onClick={() => setOrientation((side) => (side === "w" ? "b" : "w"))} />
              {game ? (
                <NavButton
                  label={explore ? "Retour à la partie" : "Explorer la position"}
                  onClick={() => {
                    if (explore) {
                      exitExplore();
                      return;
                    }
                    setExplore({ rootFen: displayedFen, moves: [], cursor: 0 });
                  }}
                />
              ) : null}
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Flèches pour avancer, F pour retourner. La flèche dorée est le coup conseillé. Clique une ligne pour la suivre.
            </p>
            {game && !explore ? <EvalChart evals={nodeEvals} ply={ply} onPick={(next) => { exitExplore(); setPly(next); }} /> : null}
          </div>

          <div
            className="flex flex-col gap-4 rounded-2xl p-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <div>
              <h2 className="text-lg" style={{ fontFamily: "var(--font-playfair), serif" }}>
                {game ? `${game.white} – ${game.black}` : loaded.kind === "position" ? "Position" : "Aucune partie"}
              </h2>
              {game ? (
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {[game.result, game.date, game.opening].filter(Boolean).join(" · ")}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm" style={{ color: "var(--text-secondary)" }} htmlFor="depth-select">
                Profondeur
              </label>
              <select
                id="depth-select"
                value={depth}
                disabled={Boolean(batch)}
                onChange={(event) => setDepth(Number(event.target.value))}
                className="min-h-11 rounded-lg px-2 text-sm"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
              >
                {DEPTHS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              {game ? (
                <button
                  type="button"
                  className="btn-gold min-h-11 rounded-lg px-4 text-sm font-bold disabled:opacity-50"
                  style={{ color: "#0a0b0c" }}
                  disabled={!engineReady || Boolean(batch) || game.moves.length === 0}
                  onClick={() => {
                    void runAnalysis();
                  }}
                >
                  Analyser la partie
                </button>
              ) : null}
              {batch ? (
                <button type="button" className="min-h-11 rounded-lg px-3 text-sm" style={{ border: "1px solid var(--border)" }} onClick={stopAnalysis}>
                  Arrêter
                </button>
              ) : null}
              {loaded.kind !== "idle" ? (
                <button type="button" className="min-h-11 rounded-lg px-3 text-sm" style={{ border: "1px solid var(--border)" }} onClick={saveReview}>
                  Enregistrer
                </button>
              ) : null}
            </div>

            {batch ? (
              <div>
                <div className="mb-1 flex justify-between text-xs" style={{ color: "var(--text-secondary)" }}>
                  <span>
                    Coup {Math.min(batch.done, game?.moves.length ?? batch.done)} / {game?.moves.length ?? 0}
                  </span>
                  <span>
                    profondeur {batch.depthNow || "…"}/{depth}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--border)" }} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} role="progressbar">
                  <div className="h-full" style={{ width: `${progress}%`, background: "var(--gold)" }} />
                </div>
              </div>
            ) : null}

            {game && doneMoves.length > 0 ? (
              <div className="space-y-1 text-sm">
                <p>{summaryText(whiteSummary)}</p>
                <p>{summaryText(blackSummary)}</p>
                {doneMoves.length < game.moves.length ? (
                  <p style={{ color: "var(--text-muted)" }}>
                    Analyse partielle : {doneMoves.length}/{game.moves.length} coups.
                  </p>
                ) : null}
              </div>
            ) : null}

            {session && !explore ? (
              <CoachPanel
                session={session}
                phase={session.phases[ply] ?? "ouverture"}
                onPick={(next) => {
                  exitExplore();
                  setPly(next);
                }}
              />
            ) : null}

            {explore ? (
              <p className="text-sm" style={{ color: "var(--gold)" }}>
                Mode position
                {explore.moves.length > 0
                  ? ` · ${explore.moves.slice(0, explore.cursor).map((move) => move.san).join(" ")}`
                  : ""}
              </p>
            ) : null}

            {currentAnalysis ? (
              <div className="rounded-xl p-3 text-sm" style={{ background: "var(--bg-secondary)" }}>
                <p className="font-semibold" style={{ color: classColor(currentAnalysis.classification) }}>
                  {classLabel(currentAnalysis.classification)}
                  {mateSwingLabel(currentAnalysis)
                    ? " · mat"
                    : currentAnalysis.cpLoss > 0
                      ? ` · ${formatCentipawnLoss(currentAnalysis.cpLoss)}`
                      : ""}
                </p>
                <p className="mt-1" style={{ color: "var(--text-secondary)" }}>
                  Meilleur coup : {currentAnalysis.bestSan ?? "—"}
                </p>
                <p style={{ color: "var(--text-secondary)" }}>Ligne : {currentAnalysis.pvSan || "—"}</p>
                <p style={{ color: "var(--text-muted)" }}>
                  {formatEval(currentAnalysis.before)} → {formatEval(currentAnalysis.after)}
                </p>
                {currentNote ? (
                  <p className="mt-2 leading-relaxed" style={{ color: "var(--text-primary)" }}>
                    {currentNote.text}
                  </p>
                ) : null}
              </div>
            ) : null}

            {positionComment ? (
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {positionComment}
              </p>
            ) : null}

            {liveEnabled ? (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
                  Lignes {currentLive ? `(profondeur ${currentLive.depth}/${depth})` : ""}
                </h3>
                {(currentLive?.lines ?? []).slice(0, 3).map((line) => {
                  const white = toWhiteView(line, sideToMove(displayedFen));
                  const text = sanLine(displayedFen, line.pvUci);
                  return (
                    <button
                      key={line.multipv}
                      type="button"
                      className="block min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm"
                      title="Suivre cette ligne"
                      style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
                      onClick={() => followLine(line.pvUci)}
                    >
                      <span className="font-semibold" style={{ color: "var(--gold-light)" }}>
                        {formatEval(white)}
                      </span>{" "}
                      {text || "…"}
                    </button>
                  );
                })}
                {!currentLive ? (
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Calcul des lignes…
                  </p>
                ) : null}
              </div>
            ) : null}

            {game ? (
              <MoveList
                moves={game.moves}
                analyses={analyses}
                ply={ply}
                exploring={Boolean(explore)}
                onPick={(next) => {
                  exitExplore();
                  setPly(next);
                }}
              />
            ) : loaded.kind === "idle" ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Importe un PGN, un pseudo Chess.com, ou une FEN. Rien n&apos;est envoyé à un compte : l&apos;analyse reste dans le navigateur.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function viewFen(loaded: Loaded, ply: number, explore: Explore | null) {
  if (explore) {
    if (explore.cursor <= 0) {
      return explore.rootFen;
    }

    return explore.moves[explore.cursor - 1]?.fen ?? explore.rootFen;
  }

  if (loaded.kind === "position") {
    return loaded.fen;
  }

  if (loaded.kind === "game") {
    if (ply <= 0) {
      return loaded.game.startFen;
    }

    return loaded.game.moves[ply - 1]?.fenAfter ?? loaded.game.startFen;
  }

  return START_FEN;
}

function lastSquares(loaded: Loaded, ply: number, explore: Explore | null) {
  if (explore && explore.cursor > 0) {
    const uci = explore.moves[explore.cursor - 1]?.uci ?? "";
    return { from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square };
  }

  if (!explore && loaded.kind === "game" && ply > 0) {
    const uci = loaded.game.moves[ply - 1]?.uci ?? "";
    return { from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square };
  }

  return null;
}

function shiftExplore(current: Explore | null, direction: number) {
  if (!current) {
    return current;
  }

  const next = current.cursor + direction;

  if (next < 0) {
    return null;
  }

  if (next > current.moves.length) {
    return current;
  }

  return { ...current, cursor: next };
}

function liveEval(fen: string, live: EngineSearch | null): NodeEval | null {
  const line = live?.lines[0];

  if (!line) {
    return null;
  }

  return toWhiteView(line, sideToMove(fen));
}

function viewerFor(username: string, white: string, black: string): Side | null {
  const name = username.trim().toLowerCase();

  if (white.toLowerCase() === name) {
    return "w";
  }

  if (black.toLowerCase() === name) {
    return "b";
  }

  return null;
}

function labelTime(timeClass: string | null) {
  if (timeClass === "bullet") return "Bullet";
  if (timeClass === "blitz") return "Blitz";
  if (timeClass === "rapid") return "Rapide";
  if (timeClass === "daily") return "Correspondance";
  return timeClass ?? "Partie";
}

function formatEnd(endTime: number | null) {
  if (!endTime) {
    return "";
  }

  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(endTime * 1000));
}

function formatSaved(iso: string) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

function mateSwingLabel(analysis: MoveAnalysis) {
  if (analysis.classification === "best" || analysis.classification === "good" || analysis.classification === "ok") {
    return false;
  }

  return analysis.before.mate != null || analysis.after.mate != null;
}

function analyzedCount(review: SavedReview) {
  return review.analyses.filter((item) => item != null).length;
}

function isAbort(error: unknown) {
  return (error instanceof DOMException && error.name === "AbortError") || error instanceof ReviewCancelled;
}

function NavButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-11 rounded-lg px-3 text-sm"
      style={{ border: "1px solid var(--border)", color: "var(--text-primary)", background: "var(--bg-card)" }}
    >
      {label}
    </button>
  );
}
