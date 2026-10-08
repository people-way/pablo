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
};

const READY_TIMEOUT_MS = 20_000;
const SEARCH_TIMEOUT_MS = 90_000;

export class ReviewEngine {
  private worker: Worker;
  private pending: PendingSearch | null = null;
  private queue: Array<() => void> = [];
  private readyPromise: Promise<void>;
  private failed = false;

  constructor(workerUrl = "/engine/stockfish-18-lite-single.js") {
    this.worker = new Worker(workerUrl);
    this.readyPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.fail(new Error("Le moteur n'a pas répondu."));
        reject(new Error("Le moteur n'a pas répondu."));
      }, READY_TIMEOUT_MS);

      const onReady = () => {
        clearTimeout(timeout);
        resolve();
      };

      this.worker.onmessage = (event) => {
        const line = String(event.data ?? "");

        if (line === "uciok") {
          this.worker.postMessage("setoption name Hash value 16");
          this.worker.postMessage("ucinewgame");
          this.worker.postMessage("isready");
          return;
        }

        if (line === "readyok") {
          onReady();
          this.worker.onmessage = (next) => this.onLine(String(next.data ?? ""));
          return;
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
    await this.readyPromise;

    if (this.failed) {
      throw new Error("Le moteur est arrêté.");
    }

    if (options.signal?.aborted) {
      throw abortError();
    }

    return new Promise((resolve, reject) => {
      const start = () => {
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
        };
        this.pending = pending;

        const timeout = setTimeout(() => {
          if (this.pending === pending) {
            pending.aborted = true;
            this.worker.postMessage("stop");
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

            pending.aborted = true;
            this.worker.postMessage("stop");
          },
          { once: true },
        );

        this.worker.postMessage(`setoption name MultiPV value ${clampMultipv(options.multipv)}`);
        this.worker.postMessage(`position fen ${options.fen}`);
        this.worker.postMessage(`go depth ${Math.max(1, Math.round(options.depth))}`);
      };

      if (this.pending) {
        this.pending.aborted = true;
        this.worker.postMessage("stop");
        this.queue.push(start);
        return;
      }

      start();
    });
  }

  dispose() {
    this.fail(new Error("Moteur fermé."));
    this.worker.terminate();
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

    if (pending) {
      if (pending.aborted) {
        pending.reject(abortError());
      } else {
        pending.resolve(snapshot(pending, bestUci));
      }
    }

    this.pump();
  }

  private pump() {
    const next = this.queue.shift();
    next?.();
  }

  private fail(error: Error) {
    this.failed = true;
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
