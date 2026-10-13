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
import { formatEta, remainingMillis } from "@/lib/review/eta";
import { clearResume, readResume, writeResume } from "@/lib/review/resume";
import { readSaved, removeSaved, upsertSaved } from "@/lib/review/storage";
import {
  activeVariation,
  emptyTrail,
  endTrail,
  fenOnTrail,
  followOnTrail,
  isBrowsing,
  jumpTrail,
  leaveTrail,
  lineFromUci,
  openVariation,
  playOnTrail,
  stepTrail,
  variationsAt,
  type VariationTrail,
} from "@/lib/review/variations";
import type { MoveAnalysis, NodeEval, ParsedGame, PgnDocument, SavedReview, Side } from "@/lib/review/types";
import { ChessBoard } from "./board";
import { CoachPanel } from "./coach-panel";
import { useMoveSwipe } from "./use-move-swipe";
import { VariationStrip } from "./variation-strip";
import { classColor, EvalBar, EvalChart, MoveList } from "./widgets";

const DEPTHS = [8, 10, 12, 14, 16];

function knownDepth(value: number) {
  return DEPTHS.includes(value) ? value : 16;
}
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

type Batch = { done: number; total: number; depthNow: number; startedAt: number };

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
  const [trail, setTrail] = useState<VariationTrail>(emptyTrail);
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
  const quotaWarned = useRef(false);
  const sessionGen = useRef(0);
  const resumeGen = useRef(0);
  const moveByRef = useRef<(direction: number) => void>(() => {});
  const edgeRef = useRef<(edge: "start" | "end") => void>(() => {});
  const [importOpen, setImportOpen] = useState(true);
  const swipe = useMoveSwipe((direction) => {
    moveByRef.current(direction);
  });

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
    const resume = readResume(window.localStorage);

    if (!resume) {
      return;
    }

    try {
      if (resume.pgn) {
        openGame(resume.pgn, resume.viewer);
        const parsed = parsePgn(resume.pgn);
        setPly(Math.min(Math.max(0, resume.ply), parsed.moves.length));
        setDepth(knownDepth(resume.depth));
        setOrientation(resume.orientation);
        setAnalyses(
          resume.analyses.length === parsed.moves.length
            ? resume.analyses
            : Array.from({ length: parsed.moves.length }, () => null),
        );
        setNodeEvals(
          resume.nodeEvals.length === parsed.moves.length + 1
            ? resume.nodeEvals
            : Array.from({ length: parsed.moves.length + 1 }, () => null),
        );
        setSavedId(resume.savedId);
        setTrail(resume.trail ?? emptyTrail());
      } else if (resume.fen) {
        openPosition(resume.fen);
        setDepth(knownDepth(resume.depth));
        setOrientation(resume.orientation);
        setSavedId(resume.savedId);
        setTrail(resume.trail ?? emptyTrail());
      }
    } catch (error) {
      clearResume(window.localStorage);
      setMessage(error instanceof Error ? error.message : "La partie en cours est illisible.");
    }
    // Restore once, from the snapshot written on the previous visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayedFen = useMemo(() => {
    const fen = viewFen(loaded, ply, null);
    return isBrowsing(trail) ? fenOnTrail(trail, fen) : fen;
  }, [loaded, ply, trail]);
  const game = loaded.kind === "game" ? loaded.game : null;
  const liveEnabled = loaded.kind !== "idle" && !batch;

  useEffect(() => {
    moveByRef.current = (direction: number) => {
      if (isBrowsing(trail)) {
        setTrail((current) => stepTrail(current, direction));
        return;
      }

      if (!game) {
        return;
      }

      setPly((current) => Math.min(game.moves.length, Math.max(0, current + direction)));
    };
    edgeRef.current = (edge) => {
      if (isBrowsing(trail)) {
        setTrail((current) => (edge === "start" ? jumpTrail(current, 0) : endTrail(current)));
        return;
      }

      if (edge === "start") {
        setPly(0);
        return;
      }

      if (game) {
        setPly(game.moves.length);
      }
    };
  }, [trail, game]);

  useEffect(() => {
    if (loaded.kind === "idle") {
      return;
    }

    const snapshot = {
      savedAt: new Date().toISOString(),
      pgn: loaded.kind === "game" ? loaded.pgn : null,
      fen: loaded.kind === "position" ? loaded.fen : null,
      depth,
      ply,
      viewer: loaded.kind === "game" ? loaded.viewer : null,
      orientation,
      savedId,
      analyses,
      nodeEvals,
      trail,
    };
    const gen = resumeGen.current;
    const timer = window.setTimeout(() => {
      if (resumeGen.current !== gen) {
        return;
      }

      try {
        writeResume(window.localStorage, snapshot);
      } catch {
        if (!quotaWarned.current) {
          quotaWarned.current = true;
          setMessage("La reprise automatique a échoué (espace plein).");
        }
      }
    }, 200);

    return () => window.clearTimeout(timer);
  }, [loaded, depth, ply, orientation, savedId, analyses, nodeEvals, trail]);

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
        moveByRef.current(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        moveByRef.current(1);
      } else       if (event.key === "Home") {
        event.preventDefault();
        edgeRef.current("start");
      } else if (event.key === "End") {
        event.preventDefault();
        edgeRef.current("end");
      } else if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        setOrientation((side) => (side === "w" ? "b" : "w"));
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function beginLoad() {
    sessionGen.current += 1;
    batchAbort.current?.abort();
    setBatch(null);
  }

  function returnToGame() {
    setTrail((current) => leaveTrail(current));
    setLive(null);
  }

  function revealBoard() {
    const active = document.activeElement;

    if (active instanceof HTMLElement && active !== document.body) {
      active.blur();
    }

    if (window.innerWidth < 1024) {
      return;
    }

    window.requestAnimationFrame(() => {
      boardAnchor.current?.scrollIntoView({ block: "start" });
    });
  }

  function openGame(pgn: string, viewer: Side | null) {
    beginLoad();
    setImportOpen(false);
    const parsed = parsePgn(pgn);
    setLoaded({ kind: "game", game: parsed, pgn, viewer });
    setPly(0);
    setTrail(emptyTrail());
    setLive(null);
    setAnalyses(Array.from({ length: parsed.moves.length }, () => null));
    setNodeEvals(Array.from({ length: parsed.moves.length + 1 }, () => null));
    setOrientation(viewer ?? "w");
    setSavedId(null);
    setMessage(null);
    revealBoard();
  }

  function openPosition(rawFen: string) {
    beginLoad();
    setImportOpen(false);
    const fen = parseFen(rawFen);
    setLoaded({ kind: "position", fen });
    setPly(0);
    setTrail(emptyTrail());
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
    const moves = lineFromUci(fen, uciMoves);

    if (moves.length === 0) {
      return;
    }

    const anchorPly = loaded.kind === "game" ? ply : null;
    setTrail((current) => followOnTrail(current, { id: crypto.randomUUID(), rootFen: fen, anchorPly, moves }));
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

    if (!move) {
      return;
    }

    const anchorPly = loaded.kind === "game" ? ply : null;
    setTrail((current) =>
      playOnTrail(current, { id: crypto.randomUUID(), rootFen: fen, anchorPly, san: move.san, uci }),
    );
  }

  async function runAnalysis() {
    const engine = engineRef.current;

    if (!game || !engine || batch) {
      return;
    }

    const controller = new AbortController();
    const gen = sessionGen.current;
    batchAbort.current = controller;
    returnToGame();
    setMessage(null);
    setBatch({ done: 0, total: game.moves.length + 1, depthNow: 0, startedAt: performance.now() });

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
              if (sessionGen.current !== gen) {
                return;
              }

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
          if (sessionGen.current !== gen) {
            return;
          }

          setAnalyses(update.analyses);
          setNodeEvals(update.nodeEvals);
          setBatch((current) =>
            current ? { ...current, done: update.done, total: update.total } : current,
          );
        },
      });

      if (sessionGen.current !== gen) {
        return;
      }

      setAnalyses(result.analyses);
      setNodeEvals(result.nodeEvals);
      setMessage("Analyse terminée.");
    } catch (error) {
      if (sessionGen.current !== gen) {
        return;
      }

      if (isAbort(error)) {
        setMessage("Analyse arrêtée. Les coups déjà calculés restent affichés.");
      } else {
        setMessage(error instanceof Error ? error.message : "L'analyse a échoué.");
      }
    } finally {
      if (sessionGen.current === gen && batchAbort.current === controller) {
        batchAbort.current = null;
        setBatch(null);
      }
    }
  }

  function startFresh() {
    resumeGen.current += 1;
    beginLoad();
    setLoaded({ kind: "idle" });
    setPly(0);
    setTrail(emptyTrail());
    setLive(null);
    setAnalyses([]);
    setNodeEvals([]);
    setSavedId(null);
    setPgnChoices([]);
    setBatch(null);
    setMessage(null);
    setImportOpen(true);

    try {
      clearResume(window.localStorage);
    } catch {
      setMessage("Impossible d'effacer la partie en cours.");
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
      fen: loaded.kind === "position" ? loaded.fen : activeVariation(trail)?.rootFen ?? null,
      depth,
      ply,
      viewer: loaded.kind === "game" ? loaded.viewer : null,
      analyses,
      nodeEvals,
      trail,
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
        setTrail(review.trail ?? emptyTrail());
      } else if (review.fen) {
        openPosition(review.fen);
        setDepth(review.depth || 16);
        setSavedId(review.id);
        setTrail(review.trail ?? emptyTrail());
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
  const browsing = isBrowsing(trail);
  const currentAnalysis = game && !browsing && ply > 0 ? analyses[ply - 1] : null;
  const currentNote = session && !browsing && ply > 0 ? session.notes[ply - 1] : null;
  const currentLive = live?.fen === displayedFen ? live.search : null;
  const storedEval = game && !browsing ? nodeEvals[ply] ?? null : null;
  const barEval = liveEval(displayedFen, currentLive) ?? storedEval;
  const hintUci =
    currentLive?.lines[0]?.pvUci[0] ??
    (!browsing && game ? analyses[ply]?.bestUci ?? null : null);
  const positionComment = browsing
    ? ""
    : game
      ? ply === 0
        ? game.startComment
        : game.moves[ply - 1]?.comment ?? ""
      : "";
  const lastMove = lastSquares(loaded, ply, trail);
  const branchFen = viewFen(loaded, ply, null);
  const savedLines = browsing || loaded.kind === "idle" ? [] : variationsAt(trail, game ? ply : null, branchFen);
  const progress = batch ? Math.round((batch.done / batch.total) * 100) : 0;
  const eta = batch
    ? formatEta(
        remainingMillis({
          done: batch.done,
          total: batch.total,
          elapsedMs: Math.max(0, performance.now() - batch.startedAt),
        }),
      )
    : null;

  return (
    <main
      className={`min-h-screen px-3 sm:px-6 ${loaded.kind === "idle" ? "py-4" : "py-2 sm:py-4"}`}
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/" className="text-sm" style={{ color: "var(--text-muted)" }}>
              ← Pablo
            </Link>
            <h1
              className={loaded.kind === "idle" ? "text-3xl" : "text-2xl sm:text-3xl"}
              style={{ fontFamily: "var(--font-playfair), serif", color: "var(--gold-light)" }}
            >
              <span className={game ? "lg:inline max-lg:hidden" : undefined}>Revue</span>
              {game ? <span className="lg:hidden">{game.white} – {game.black}</span> : null}
            </h1>
          </div>
          <p className="text-sm" style={{ color: engineReady ? "var(--text-secondary)" : "var(--gold)" }}>
            {engineReady ? "Stockfish prêt, dans le navigateur" : "Chargement du moteur…"}
          </p>
        </header>

        <section
          data-import-open={loaded.kind !== "idle" && !importOpen ? "false" : "true"}
          className={`rounded-2xl sm:p-4 ${loaded.kind !== "idle" && !importOpen ? "p-2" : "p-3"}`}
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          {loaded.kind !== "idle" ? (
            <div className={`revue-import-bar flex gap-2 lg:hidden ${importOpen ? "mb-3" : ""}`}>
              <button
                type="button"
                className="min-h-11 flex-1 rounded-lg px-3 text-left text-sm font-semibold"
                style={{ border: "1px solid var(--border)", color: "var(--text-primary)" }}
                aria-expanded={importOpen}
                onClick={() => setImportOpen((open) => !open)}
              >
                {importOpen ? "Masquer l'import" : "Importer une partie"}
              </button>
              <button
                type="button"
                className="min-h-11 shrink-0 rounded-lg px-3 text-sm"
                style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                onClick={startFresh}
              >
                Nouvelle partie
              </button>
            </div>
          ) : null}
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

        <section
          ref={boardAnchor}
          data-revue-live={loaded.kind === "idle" ? "false" : "true"}
          className="grid gap-4 lg:items-start lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]"
        >
          <div className="revue-board-col flex min-w-0 flex-col gap-3">
            <div className="revue-board flex w-full min-w-0 gap-2" {...swipe}>
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
            <div className="revue-nav flex w-full min-w-0 flex-wrap gap-2">
              <NavButton label="Début" onClick={() => edgeRef.current("start")} />
              <NavButton label="Précédent" onClick={() => moveByRef.current(-1)} />
              <NavButton label="Suivant" onClick={() => moveByRef.current(1)} />
              <NavButton label="Fin" onClick={() => edgeRef.current("end")} />
              <NavButton label="Retourner" onClick={() => setOrientation((side) => (side === "w" ? "b" : "w"))} />
            </div>
            <VariationStrip
              trail={trail}
              savedLines={savedLines}
              returnLabel={browsing ? (game ? "Retour à la partie" : "Position de départ") : null}
              onJump={(cursor) => setTrail((current) => jumpTrail(current, cursor))}
              onOpen={(id) => setTrail((current) => openVariation(current, id))}
              onReturn={returnToGame}
            />
            <p className="revue-hint text-xs" style={{ color: "var(--text-muted)" }}>
              Balayez l&apos;échiquier pour avancer ou reculer. Flèches, F pour retourner. La flèche dorée est le coup conseillé.
            </p>
            {game && !browsing ? (
              <div className="revue-chart">
                <EvalChart evals={nodeEvals} ply={ply} onPick={(next) => { returnToGame(); setPly(next); }} />
              </div>
            ) : null}
          </div>

          <div
            className="revue-side-col flex flex-col gap-4 rounded-2xl p-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <div className="revue-title">
              <h2 className="text-lg" style={{ fontFamily: "var(--font-playfair), serif" }}>
                {game ? `${game.white} – ${game.black}` : loaded.kind === "position" ? "Position" : "Aucune partie"}
              </h2>
              {game ? (
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {[game.result, game.date, game.opening].filter(Boolean).join(" · ")}
                </p>
              ) : null}
            </div>

            <div className="revue-controls flex flex-wrap items-center gap-2">
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
              {loaded.kind !== "idle" ? (
                <button
                  type="button"
                  className="min-h-11 shrink-0 rounded-lg px-3 text-sm"
                  style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                  onClick={startFresh}
                >
                  Nouvelle partie
                </button>
              ) : null}
            </div>

            {batch ? (
              <div className="revue-progress">
                <div className="mb-1 flex flex-wrap justify-between gap-x-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                  <span>
                    Coup {Math.min(batch.done, game?.moves.length ?? batch.done)} / {game?.moves.length ?? 0}
                  </span>
                  <span>
                    profondeur {batch.depthNow || "…"}/{depth}
                    {eta ? ` · ${eta}` : batch.done === 0 ? " · durée après le 1er coup" : ""}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--border)" }} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} role="progressbar">
                  <div className="h-full" style={{ width: `${progress}%`, background: "var(--gold)" }} />
                </div>
              </div>
            ) : null}

            {game && doneMoves.length > 0 ? (
              <div className="revue-summaries space-y-1 text-sm">
                <p>{summaryText(whiteSummary)}</p>
                <p>{summaryText(blackSummary)}</p>
                {doneMoves.length < game.moves.length ? (
                  <p style={{ color: "var(--text-muted)" }}>
                    Analyse partielle : {doneMoves.length}/{game.moves.length} coups.
                  </p>
                ) : null}
              </div>
            ) : null}

            {session && !browsing ? (
              <div className="revue-coach">
                <CoachPanel
                  session={session}
                  phase={session.phases[ply] ?? "ouverture"}
                  onPick={(next) => {
                    returnToGame();
                    setPly(next);
                  }}
                />
              </div>
            ) : null}

            {currentAnalysis ? (
              <div className="revue-note rounded-xl p-3 text-sm" style={{ background: "var(--bg-secondary)" }}>
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
              <p className="revue-comment text-sm" style={{ color: "var(--text-secondary)" }}>
                {positionComment}
              </p>
            ) : null}

            {liveEnabled ? (
              <div className="revue-lines space-y-2">
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
              <div className="revue-moves">
                <MoveList
                  moves={game.moves}
                  analyses={analyses}
                  ply={ply}
                  exploring={browsing}
                  onPick={(next) => {
                    returnToGame();
                    setPly(next);
                  }}
                />
              </div>
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

function lastSquares(loaded: Loaded, ply: number, trail: VariationTrail) {
  const line = activeVariation(trail);

  if (line && trail.cursor > 0) {
    return squares(line.moves[trail.cursor - 1]?.uci ?? "");
  }

  if (!line && loaded.kind === "game" && ply > 0) {
    return squares(loaded.game.moves[ply - 1]?.uci ?? "");
  }

  return null;
}

function squares(uci: string) {
  if (uci.length < 4) {
    return null;
  }

  return { from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square };
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
      className="min-h-11 shrink-0 rounded-lg px-3 text-sm"
      style={{ border: "1px solid var(--border)", color: "var(--text-primary)", background: "var(--bg-card)" }}
    >
      {label}
    </button>
  );
}
