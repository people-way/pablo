import { parseBestMove, parseInfoLine, type InfoScore } from "./uci";

export type EngineLine = InfoScore;

export type EngineSearch = {
  bestUci: string | null;
  depth: number;
  lines: EngineLine[];
};

type PendingSearch = {
  lines: Map<number, EngineLine>;
  resolve: (result: EngineSearch) => void;
  reject: (error: Error) => void;
  onProgress?: (result: EngineSearch) => void;
  aborted: boolean;
  timedOut: boolean;
};

const READY_TIMEOUT_MS = 20_000;
const SEARCH_TIMEOUT_MS = 45_000;
const STOP_WATCH_MS = 2_500;

export class ReviewEngine {
  private worker: Worker;
  private pending: PendingSearch | null = null;
  private queue: Array<() => void> = [];
  private readyPromise: Promise<void>;
  private failed = false;
  private generation = 0;
  private stopWatch: ReturnType<typeof setTimeout> | null = null;
  private readonly workerUrl: string;

  constructor(workerUrl = "/engine/stockfish-18-lite-single.js") {
    this.workerUrl = workerUrl;
    this.worker = this.createWorker();
    this.readyPromise = this.whenReady();
  }

  get ready() {
    return this.readyPromise;
  }

  async search(options: {
    fen: string;
    depth: number;
    multipv: number;
    signal?: AbortSignal;
    onProgress?: (result: EngineSearch) => void;
  }): Promise<EngineSearch> {
    const generation = this.generation;
    await this.readyPromise;

    if (generation !== this.generation) {
      return this.search(options);
    }

    if (this.failed) {
      throw new Error("Le moteur est arrêté.");
    }

    if (options.signal?.aborted) {
      throw abortError();
    }

    return new Promise((resolve, reject) => {
      const start = () => {
        if (this.generation !== generation) {
          reject(abortError());
          this.pump();
          return;
        }

        if (options.signal?.aborted) {
          reject(abortError());
          this.pump();
          return;
        }

        const pending: PendingSearch = {
          lines: new Map(),
          resolve,
          reject,
          onProgress: options.onProgress,
          aborted: false,
          timedOut: false,
        };
        this.pending = pending;

        const timeout = setTimeout(() => {
          if (this.pending === pending && !pending.aborted) {
            this.requestStop(pending, "timeout");
          }
        }, SEARCH_TIMEOUT_MS);

        const settle = () => clearTimeout(timeout);
        const originalResolve = pending.resolve;
        const originalReject = pending.reject;
        pending.resolve = (result) => {
          settle();
          originalResolve(result);
        };
        pending.reject = (error) => {
          settle();
          originalReject(error);
        };

        options.signal?.addEventListener(
          "abort",
          () => {
            if (this.pending !== pending) {
              return;
            }

            this.requestStop(pending, "abort");
          },
          { once: true },
        );

        this.worker.postMessage(`setoption name MultiPV value ${clampMultipv(options.multipv)}`);
        this.worker.postMessage(`position fen ${options.fen}`);
        this.worker.postMessage(`go depth ${Math.max(1, Math.round(options.depth))}`);
      };

      if (this.pending) {
        this.requestStop(this.pending, "abort");
        this.queue.push(start);
        return;
      }

      start();
    });
  }

  dispose() {
    this.clearStopWatch();
    this.fail(new Error("Moteur fermé."));
    this.worker.terminate();
  }

  private createWorker() {
    return new Worker(this.workerUrl);
  }

  private whenReady() {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.fail(new Error("Le moteur n'a pas répondu."));
        reject(new Error("Le moteur n'a pas répondu."));
      }, READY_TIMEOUT_MS);

      this.worker.onmessage = (event) => {
        const line = String(event.data ?? "");

        if (line === "uciok") {
          this.worker.postMessage("setoption name Hash value 16");
          this.worker.postMessage("ucinewgame");
          this.worker.postMessage("isready");
          return;
        }

        if (line === "readyok") {
          clearTimeout(timeout);
          this.worker.onmessage = (next) => this.onLine(String(next.data ?? ""));
          resolve();
        }
      };

      this.worker.onerror = () => {
        clearTimeout(timeout);
        const error = new Error("Le moteur Stockfish n'a pas démarré.");
        this.fail(error);
        reject(error);
      };

      this.worker.postMessage("uci");
    });
  }

  private requestStop(pending: PendingSearch, mode: "abort" | "timeout") {
    if (this.pending !== pending) {
      return;
    }

    if (mode === "abort") {
      pending.aborted = true;
    } else {
      pending.timedOut = true;
    }

    this.worker.postMessage("stop");
    this.armStopWatch(pending);
  }

  private armStopWatch(pending: PendingSearch) {
    this.clearStopWatch();
    this.stopWatch = setTimeout(() => {
      if (this.pending !== pending) {
        return;
      }

      this.pending = null;
      const partial = snapshot(pending, null);

      if (pending.timedOut && !pending.aborted && partial.lines.length > 0) {
        pending.resolve(partial);
      } else if (pending.aborted) {
        pending.reject(abortError());
      } else {
        pending.reject(new Error("Le moteur n'a pas répondu."));
      }

      this.reboot();
    }, STOP_WATCH_MS);
  }

  private reboot() {
    this.clearStopWatch();
    this.generation += 1;
    this.worker.onmessage = null;
    this.worker.terminate();
    this.failed = false;
    this.pending = null;
    this.worker = this.createWorker();
    this.readyPromise = this.whenReady();
    void this.readyPromise.then(() => this.pump()).catch(() => undefined);
  }

  private clearStopWatch() {
    if (this.stopWatch) {
      clearTimeout(this.stopWatch);
      this.stopWatch = null;
    }
  }

  private onLine(line: string) {
    const best = parseBestMove(line);

    if (best !== undefined) {
      this.finish(best);
      return;
    }

    const info = parseInfoLine(line);

    if (!info || !this.pending || this.pending.aborted) {
      return;
    }

    const previous = this.pending.lines.get(info.multipv);

    if (previous && previous.depth > info.depth) {
      return;
    }

    this.pending.lines.set(info.multipv, info);
    this.pending.onProgress?.(snapshot(this.pending, null));
  }

  private finish(bestUci: string | null) {
    const pending = this.pending;
    this.pending = null;
    this.clearStopWatch();

    if (pending) {
      if (pending.aborted && !pending.timedOut) {
        pending.reject(abortError());
      } else {
        pending.resolve(snapshot(pending, bestUci));
      }
    }

    this.pump();
  }

  private pump() {
    const next = this.queue.shift();

    if (!next) {
      return;
    }

    void this.readyPromise.then(() => next()).catch(() => undefined);
  }

  private fail(error: Error) {
    this.failed = true;
    this.clearStopWatch();
    const pending = this.pending;
    this.pending = null;
    pending?.reject(error);
    this.queue = [];
  }
}

function snapshot(pending: PendingSearch, bestUci: string | null): EngineSearch {
  const lines = [...pending.lines.values()].sort((left, right) => left.multipv - right.multipv);
  const depth = lines.reduce((max, line) => Math.max(max, line.depth), 0);

  return {
    bestUci: bestUci ?? lines[0]?.pvUci[0] ?? null,
    depth,
    lines,
  };
}

function clampMultipv(value: number) {
  return Math.max(1, Math.min(5, Math.round(value)));
}

function abortError() {
  return new DOMException("Analyse interrompue.", "AbortError");
}
