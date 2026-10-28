"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AccountNav } from "@/components/account-nav";
import { LineDrill } from "@/components/ouvertures/line-drill";
import { LineTree } from "@/components/ouvertures/line-tree";
import { cacheIsFresh, readCoachCache, writeCoachCache, type CoachCache } from "@/lib/openings/coach-storage";
import { formatPly, formatRecord, parties } from "@/lib/openings/line-format";
import { findFirstInaccuracy, type ProbeHit } from "@/lib/openings/probe";
import type { ColorName, OpeningWeakness, RepertoireReport, TreeNode } from "@/lib/openings/repertoire-types";
import { toAnalysisSaveResult } from "@/lib/openings/save-payload";
import { classLabel } from "@/lib/review/classify";
import { ReviewEngine } from "@/lib/review/engine-client";
import { sideToMove, toWhiteView } from "@/lib/review/scores";

type Selection = {
  id: string;
  title: string;
  idea: string;
  replaySans: string[];
  setupSans: string[];
  quizSan: string | null;
  orientation: "w" | "b";
  playedSan: string;
  color: ColorName;
  ply: number;
};

const MONTHS = [6, 9, 12] as const;

export function CoachApp() {
  const params = useSearchParams();
  const queryUser = params.get("username")?.trim() ?? "";
  const queryMonths = clampMonths(params.get("months"), null);
  const [username, setUsername] = useState(queryUser);
  const [months, setMonths] = useState<number>(queryMonths ?? 9);
  const [report, setReport] = useState<RepertoireReport | null>(null);
  const [probes, setProbes] = useState<Record<string, ProbeHit | null>>({});
  const [probeNote, setProbeNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [color, setColor] = useState<ColorName>("white");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [saveNote, setSaveNote] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const engineRef = useRef<ReviewEngine | null>(null);
  const probesRef = useRef(probes);
  const drillRef = useRef<HTMLElement | null>(null);
  const booted = useRef(false);
  probesRef.current = probes;

  const load = useCallback(async (name: string, windowMonths: number) => {
    setLoading(true);
    setError("");
    setProbeNote("");
    try {
      const response = await fetch(`/api/ouvertures?username=${encodeURIComponent(name)}&months=${windowMonths}`);
      const body = (await response.json()) as RepertoireReport & { error?: { message?: string } };
      if (!response.ok) {
        setError(body.error?.message ?? "Chess.com n'a pas répondu.");
        return;
      }
      setReport(body);
      setProbes({});
      const first = body.weaknesses[0];
      setColor(first?.color ?? (body.colors.white.stats.games >= body.colors.black.stats.games ? "white" : "black"));
      setSelection(first ? selectionFromWeakness(first) : null);
      writeCoachCache({
        version: 1,
        username: name,
        months: windowMonths,
        savedAt: new Date().toISOString(),
        report: body,
        probes: {},
      });
    } catch {
      setError("Impossible de joindre le coach. Réessaie.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const engine = new ReviewEngine();
    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (booted.current) {
      return;
    }
    booted.current = true;
    const cache = readCoachCache();
    const name = queryUser || cache?.username || "";
    const windowMonths = queryMonths ?? cache?.months ?? 9;
    setUsername(name);
    setMonths(windowMonths);
    if (cache && sameRequest(cache, name, windowMonths)) {
      setReport(cache.report);
      setProbes(cache.probes ?? {});
      const first = cache.report.weaknesses[0];
      setColor(first?.color ?? "white");
      setSelection(first ? selectionFromWeakness(first) : null);
    }
    const stale = !cache || !sameRequest(cache, name, windowMonths) || !cacheIsFresh(cache);
    if (name && stale) {
      void load(name, windowMonths);
    }
  }, [load, queryMonths, queryUser]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((data: { user?: { email?: string; chess_com_username?: string | null } | null }) => {
        if (cancelled) {
          return;
        }
        setSignedIn(Boolean(data.user));
        const savedName = data.user?.chess_com_username?.trim();
        if (savedName) {
          setUsername((current) => current || savedName);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!report) {
      return;
    }
    const tree = report.colors[color].tree;
    const next = new Set<string>([tree.id, ...tree.children.map((child) => child.id)]);
    if (selection && selection.color === color) {
      for (let index = 1; index <= selection.replaySans.length; index += 1) {
        next.add(`${color}:${selection.replaySans.slice(0, index).join(" ")}`);
      }
    }
    setOpenIds([...next]);
  }, [report, color, selection]);

  useEffect(() => {
    if (!report || !signedIn) {
      if (report) {
        setSaveNote("Sans compte, le rapport reste sur cet appareil.");
      }
      return;
    }
    let cancelled = false;
    fetch("/api/analyses/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        result: toAnalysisSaveResult(report),
        chessUsername: report.username,
      }),
    })
      .then((response) => {
        if (!cancelled) {
          setSaveNote(response.ok ? "Stats enregistrées sur le compte." : "Rapport gardé sur cet appareil.");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSaveNote("Rapport gardé sur cet appareil.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [report, signedIn]);

  useEffect(() => {
    if (!report) {
      return;
    }
    const engine = engineRef.current;
    if (!engine) {
      return;
    }
    const targets = report.weaknesses.filter((item) => !(item.id in probesRef.current)).slice(0, 4);
    if (targets.length === 0) {
      return;
    }
    const controller = new AbortController();
    const started = Date.now();
    let cancelled = false;
    const next: Record<string, ProbeHit | null> = { ...probesRef.current };

    void (async () => {
      for (let index = 0; index < targets.length; index += 1) {
        if (cancelled || controller.signal.aborted || Date.now() - started > 20_000) {
          break;
        }
        const weakness = targets[index];
        setProbeNote(`Moteur : ligne ${index + 1} sur ${targets.length}.`);
        try {
          const hit = await findFirstInaccuracy({
            sans: weakness.sans,
            user: weakness.color === "white" ? "w" : "b",
            untilPly: weakness.ply,
            signal: controller.signal,
            search: (fen, signal) => searchPosition(engine, fen, signal),
          });
          next[weakness.id] = hit;
          if (!cancelled) {
            setProbes({ ...next });
          }
        } catch {
          if (controller.signal.aborted || cancelled) {
            return;
          }
          break;
        }
      }
      if (!cancelled) {
        setProbeNote("");
        const cache = readCoachCache();
        if (cache && cache.report.fetchedAt === report.fetchedAt) {
          writeCoachCache({ ...cache, probes: next });
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [report]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const name = username.trim();
    if (!/^[A-Za-z0-9_-]{3,25}$/.test(name)) {
      setError("Pseudo Chess.com : 3 à 25 lettres, chiffres, _ ou -.");
      return;
    }
    void load(name, months);
  }

  function chooseWeakness(weakness: OpeningWeakness) {
    setColor(weakness.color);
    setSelection(selectionFromWeakness(weakness, probes[weakness.id]));
    drillRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function replayNode(node: TreeNode) {
    const sans = sansFromId(node.id);
    setSelection({
      id: node.id,
      title: node.openingName === "Ouverture non identifiée" ? node.san ?? "Ligne" : node.openingName,
      idea: `${node.stats.games} parties, ${node.stats.scorePct}% des points. ${formatRecord(node.stats.wins, node.stats.draws, node.stats.losses)}.`,
      replaySans: sans,
      setupSans: sans,
      quizSan: null,
      orientation: color === "white" ? "w" : "b",
      playedSan: node.san ?? "",
      color,
      ply: node.ply,
    });
    drillRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const open = new Set(openIds);
  const activeTree = report?.colors[color];
  const selectedProbe = selection ? probes[selection.id] : undefined;

  return (
    <>
      <AccountNav />
      <main className="min-h-screen px-4 pt-20 pb-16 sm:px-6" style={{ background: "var(--bg-primary)" }}>
        <div className="mx-auto flex max-w-6xl flex-col gap-5">
          <header>
            <Link href="/" className="text-sm" style={{ color: "var(--text-muted)" }}>
              ← Pablo
            </Link>
            <h1 className="text-4xl" style={{ fontFamily: "var(--font-playfair), serif", color: "var(--gold-light)" }}>
              Coach d&apos;ouvertures
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
              Ton répertoire réel sur Chess.com, pas une liste d&apos;ECO. Je regarde les lignes que tu répètes, le score, et l&apos;endroit où tu sors de la théorie.
            </p>
          </header>

          <form
            onSubmit={submit}
            className="flex flex-col gap-3 rounded-2xl p-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <label htmlFor="coach-username" className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: "var(--text-secondary)" }}>
              Pseudo Chess.com
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="coach-username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="hugoboure"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="min-h-11 flex-1 rounded-xl px-4 text-base outline-none"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-gold)", color: "var(--text-primary)" }}
              />
              <button type="submit" className="btn-gold min-h-11 rounded-xl px-5 text-sm font-bold" style={{ color: "#0a0b0c" }} disabled={loading}>
                {loading ? "Lecture…" : "Lire le répertoire"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Période">
              {MONTHS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className="min-h-11 rounded-lg px-3 text-sm font-semibold"
                  aria-pressed={months === value}
                  style={{
                    background: months === value ? "var(--gold)" : "transparent",
                    color: months === value ? "#0a0b0c" : "var(--text-secondary)",
                    border: "1px solid var(--border)",
                  }}
                  onClick={() => setMonths(value)}
                >
                  {value} mois
                </button>
              ))}
            </div>
            <p className="text-xs leading-5" style={{ color: "var(--text-muted)" }}>
              Blitz, rapide et parties longues. Les bullets sont laissées de côté. Les archives restent en cache six heures.
            </p>
          </form>

          {error ? (
            <p role="alert" className="text-sm" style={{ color: "#ff7070" }}>
              {error}
            </p>
          ) : null}

          {report ? (
            <>
              <section className="rounded-2xl p-4 sm:p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-gold)" }} aria-live="polite">
                <p className="text-xs font-bold tracking-[0.22em] uppercase" style={{ color: "var(--gold)" }}>
                  Pablo
                </p>
                <p className="mt-2 text-base leading-7" style={{ color: "var(--text-primary)" }}>
                  {report.summary}
                </p>
                <p className="mt-3 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                  {parties(report.gameCount)} retenues
                  {report.rating.latest != null ? ` · dernier Elo ${report.rating.latest}` : ""}
                  {report.rating.average != null ? ` · moyenne ${report.rating.average}` : ""}
                  {report.skippedBullet > 0 ? ` · ${report.skippedBullet} bullets ignorées` : ""}
                  {report.skippedShort > 0 ? ` · ${report.skippedShort} parties trop courtes` : ""}
                  {report.capped ? " · 500 parties les plus récentes" : ""}
                  {loading ? " · mise à jour…" : ""}
                </p>
                {probeNote ? (
                  <p className="mt-2 text-sm" style={{ color: "var(--gold)" }}>
                    {probeNote}
                  </p>
                ) : null}
                {saveNote ? (
                  <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
                    {saveNote}
                  </p>
                ) : null}
              </section>

              <section className="flex flex-col gap-3">
                <h2 className="text-2xl" style={{ fontFamily: "var(--font-playfair), serif" }}>
                  Ce qui te coûte des points
                </h2>
                {report.weaknesses.length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    Pas de ligne assez répétée pour un diagnostic. Joue encore, ou élargis la fenêtre.
                  </p>
                ) : (
                  <ul className="grid gap-3">
                    {report.weaknesses.map((weakness) => {
                      const probe = probes[weakness.id];
                      return (
                        <li key={weakness.id} className="rounded-2xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h3 className="text-lg font-semibold">
                              {weakness.openingName}
                              {weakness.variation ? ` · ${weakness.variation}` : ""}
                            </h3>
                            <span className="text-sm" style={{ color: scoreColor(weakness.stats.scorePct) }}>
                              {weakness.color === "white" ? "Blancs" : "Noirs"} · {weakness.stats.games} · {weakness.stats.scorePct}% des points
                            </span>
                          </div>
                          <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                            {weakness.line}
                          </p>
                          <p className="mt-3 text-sm leading-6" style={{ color: "var(--text-primary)" }}>
                            {weakness.diagnosis}
                          </p>
                          <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                            {weakness.whatToPlay}
                          </p>
                          {probe ? (
                            <p className="mt-2 text-sm leading-6" style={{ color: "var(--gold-light)" }}>
                              Première imprécision : {formatPly(weakness.sans, probe.ply)} {probe.playedSan}
                              {probe.bestSan ? ` au lieu de ${probe.bestSan}` : ""}. {classLabel(probe.classification)}, −
                              {(probe.cpLoss / 100).toFixed(1)} pion.
                            </p>
                          ) : null}
                          {probe === null ? (
                            <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
                              Pas d&apos;imprécision nette sur la ligne moyenne, à profondeur 8. Le score vient de plus loin.
                            </p>
                          ) : null}
                          <div className="mt-3 flex flex-wrap gap-3">
                            <button
                              type="button"
                              className="btn-gold min-h-11 rounded-lg px-4 text-sm font-bold"
                              style={{ color: "#0a0b0c" }}
                              onClick={() => chooseWeakness(weakness)}
                            >
                              Rejouer la ligne
                            </button>
                            {weakness.sampleUrl ? (
                              <a className="min-h-11 inline-flex items-center text-sm underline" style={{ color: "var(--gold)" }} href={weakness.sampleUrl} target="_blank" rel="noreferrer">
                                Une partie Chess.com
                              </a>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {selection ? (
                <section ref={drillRef} className="rounded-2xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <LineDrill
                    key={`${selection.id}:${selectedProbe?.bestSan ?? selection.quizSan ?? "replay"}`}
                    title={selection.title}
                    idea={selection.idea}
                    replaySans={selection.replaySans}
                    setupSans={selectedProbe?.bestSan ? selection.replaySans.slice(0, selectedProbe.ply - 1) : selection.setupSans}
                    quizSan={selectedProbe?.bestSan ?? selection.quizSan}
                    orientation={selection.orientation}
                    playedSan={selectedProbe?.playedSan ?? selection.playedSan}
                  />
                </section>
              ) : null}

              <section className="rounded-2xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-2xl" style={{ fontFamily: "var(--font-playfair), serif" }}>
                    Arbre du répertoire
                  </h2>
                  <div className="flex gap-2" role="tablist" aria-label="Couleur">
                    {(["white", "black"] as const).map((side) => (
                      <button
                        key={side}
                        type="button"
                        role="tab"
                        aria-selected={color === side}
                        className="min-h-11 rounded-lg px-3 text-sm font-semibold"
                        style={{
                          background: color === side ? "var(--gold)" : "transparent",
                          color: color === side ? "#0a0b0c" : "var(--text-secondary)",
                          border: "1px solid var(--border)",
                        }}
                        onClick={() => setColor(side)}
                      >
                        {side === "white" ? "Blancs" : "Noirs"}
                        {report.colors[side].stats.games > 0
                          ? ` · ${report.colors[side].stats.scorePct}%`
                          : ""}
                      </button>
                    ))}
                  </div>
                </div>
                {activeTree ? (
                  <p className="mb-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {parties(activeTree.stats.games)}, {activeTree.stats.scorePct}% des points ({formatRecord(activeTree.stats.wins, activeTree.stats.draws, activeTree.stats.losses)}).
                  </p>
                ) : null}
                <LineTree
                  nodes={activeTree?.tree.children ?? []}
                  open={open}
                  activeId={selection?.color === color ? selection.id : null}
                  onToggle={(id) => {
                    setOpenIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
                  }}
                  onReplay={replayNode}
                />
              </section>
            </>
          ) : loading ? (
            <p className="text-sm" style={{ color: "var(--gold)" }}>
              Je lis tes archives Chess.com. Ça prend quelques secondes.
            </p>
          ) : null}
        </div>
      </main>
    </>
  );
}

function selectionFromWeakness(weakness: OpeningWeakness, probe?: ProbeHit | null): Selection {
  return {
    id: weakness.id,
    title: weakness.variation ? `${weakness.openingName} · ${weakness.variation}` : weakness.openingName,
    idea: weakness.idea,
    replaySans: weakness.drill.replaySans,
    setupSans: probe?.bestSan ? weakness.sans.slice(0, probe.ply - 1) : weakness.drill.setupSans,
    quizSan: probe?.bestSan ?? weakness.drill.quizSan,
    orientation: weakness.drill.orientation,
    playedSan: probe?.playedSan ?? weakness.playedSan,
    color: weakness.color,
    ply: weakness.ply,
  };
}

function sansFromId(id: string) {
  const index = id.indexOf(":");
  const rest = index === -1 ? "" : id.slice(index + 1);
  return rest.split(" ").filter(Boolean);
}

function sameRequest(cache: CoachCache, username: string, months: number) {
  return cache.username.toLowerCase() === username.toLowerCase() && cache.months === months;
}

function clampMonths(value: string | null, fallback: number | null) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return fallback;
  }
  return Math.min(12, Math.max(6, parsed));
}

function scoreColor(score: number) {
  if (score < 40) return "#ff7070";
  if (score < 50) return "#e8a84c";
  return "#8ce0ac";
}

async function searchPosition(engine: ReviewEngine, fen: string, signal: AbortSignal) {
  const result = await engine.search({ fen, depth: 8, multipv: 1, signal });
  const line = result.lines[0];
  if (!line || !result.bestUci) {
    return null;
  }
  return {
    bestUci: result.bestUci,
    whiteEval: toWhiteView({ cp: line.cp, mate: line.mate }, sideToMove(fen)),
  };
}
