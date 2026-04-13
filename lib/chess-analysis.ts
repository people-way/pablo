import { Chess } from "chess.js";
import initStockfish from "stockfish";

const ENGINE_FLAVOR = "lite-single";
const ENGINE_DEPTH = 10;
const ENGINE_HASH_MB = 16;
const ENGINE_TIMEOUT_MS = 15_000;
const MATE_SENTINEL_CP = 1_000;
const MAX_MATE_DISTANCE_CP = 500;

type InternalColor = "w" | "b";
type ScoreKind = "cp" | "mate";

type StockfishInstance = {
  listener?: (line: string) => void;
  sendCommand: (command: string) => void;
};

type StockfishFactory = (
  enginePath?: string,
) => Promise<StockfishInstance> | StockfishInstance;

type EngineScore =
  | {
      kind: "cp";
      value: number;
    }
  | {
      kind: "mate";
      value: number;
    };

type ParsedInfoScore = {
  depth: number;
  score: EngineScore;
};

type EngineEvaluation = {
  bestmove: string | null;
  score: EngineScore;
};

export type AnalysisPerspective = "white" | "black";
export type MoveClassification = "blunder" | "mistake" | "inaccuracy";

export type AnalysisFinding = {
  move_number: number;
  move: string;
  color: AnalysisPerspective;
  classification: MoveClassification;
  centipawn_loss: number;
  description: string;
};

export type GameAnalysisReport = {
  total_moves: number;
  blunders: number;
  mistakes: number;
  inaccuracies: number;
  avg_centipawn_loss: number;
  summary: string;
  findings: AnalysisFinding[];
};

export class ChessAnalysisError extends Error {
  code: string;
  status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.name = "ChessAnalysisError";
    this.code = code;
    this.status = status;
  }
}

class StockfishClient {
  private enginePromise: Promise<StockfishInstance>;
  private queue: Promise<unknown> = Promise.resolve();
  private initPromise: Promise<void>;

  constructor() {
    const factory = initStockfish as unknown as StockfishFactory;
    this.enginePromise = Promise.resolve(factory(ENGINE_FLAVOR));
    this.initPromise = this.enqueue(async () => {
      const engine = await this.enginePromise;

      await this.waitForLine(
        engine,
        (line) => line === "uciok",
        () => {
          engine.sendCommand("uci");
        },
      );

      await this.waitForLine(
        engine,
        (line) => line === "readyok",
        () => {
          engine.sendCommand(`setoption name Hash value ${ENGINE_HASH_MB}`);
          engine.sendCommand("isready");
        },
      );
    });
  }

  async beginGame() {
    return this.enqueue(async () => {
      await this.initPromise;
      const engine = await this.enginePromise;

      await this.waitForLine(
        engine,
        (line) => line === "readyok",
        () => {
          engine.sendCommand("ucinewgame");
          engine.sendCommand("isready");
        },
      );
    });
  }

  async evaluateFen(fen: string, depth: number) {
    return this.enqueue(async () => {
      await this.initPromise;
      const engine = await this.enginePromise;
      let latestScore: ParsedInfoScore | undefined;

      const bestmoveLine = await this.waitForLine(
        engine,
        (line) => line.startsWith("bestmove "),
        () => {
          engine.sendCommand(`position fen ${fen}`);
          engine.sendCommand(`go depth ${depth}`);
        },
        (line) => {
          const parsed = parseInfoScore(line);

          if (!parsed) {
            return;
          }

          if (!latestScore || parsed.depth >= latestScore.depth) {
            latestScore = parsed;
          }
        },
      );

      const finalScore: EngineScore = latestScore
        ? latestScore.score
        : { kind: "cp", value: 0 };

      return {
        bestmove: bestmoveLine.split(/\s+/)[1] ?? null,
        score: finalScore,
      } satisfies EngineEvaluation;
    });
  }

  private enqueue<T>(task: () => Promise<T>) {
    const run = this.queue.then(task, task);
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private waitForLine(
    engine: StockfishInstance,
    predicate: (line: string) => boolean,
    setup: () => void,
    onLine?: (line: string) => void,
  ) {
    return new Promise<string>((resolve, reject) => {
      const previousListener = engine.listener;
      const timeout = setTimeout(() => {
        engine.listener = previousListener;
        reject(new Error("Stockfish timed out while analyzing the game."));
      }, ENGINE_TIMEOUT_MS);

      engine.listener = (rawLine) => {
        const line = normalizeEngineLine(rawLine);

        if (!line) {
          return;
        }

        onLine?.(line);

        if (!predicate(line)) {
          return;
        }

        clearTimeout(timeout);
        engine.listener = previousListener;
        resolve(line);
      };

      try {
        setup();
      } catch (error) {
        clearTimeout(timeout);
        engine.listener = previousListener;
        reject(error);
      }
    });
  }
}

let stockfishClient: StockfishClient | undefined;

export async function analyzePgn(
  rawPgn: string,
  perspective?: AnalysisPerspective,
): Promise<GameAnalysisReport> {
  const pgn = rawPgn.trim();

  if (!pgn) {
    throw new ChessAnalysisError("missing_pgn", 400, "Provide a PGN string.");
  }

  const game = new Chess();

  try {
    game.loadPgn(pgn);
  } catch {
    throw new ChessAnalysisError(
      "invalid_pgn",
      400,
      "The provided PGN could not be parsed.",
    );
  }

  const moves = game.history({ verbose: true });

  if (moves.length === 0) {
    throw new ChessAnalysisError(
      "empty_game",
      400,
      "The PGN parsed, but it does not contain any moves.",
    );
  }

  const normalizedPerspective = normalizePerspective(perspective);
  const relevantMoves = moves.filter(
    (move) => !normalizedPerspective || move.color === normalizedPerspective,
  );

  if (relevantMoves.length === 0) {
    return {
      total_moves: 0,
      blunders: 0,
      mistakes: 0,
      inaccuracies: 0,
      avg_centipawn_loss: 0,
      summary: "No moves matched the requested perspective in this PGN.",
      findings: [],
    };
  }

  const positions = [moves[0].before, ...moves.map((move) => move.after)];
  const evaluationCache = new Map<string, EngineEvaluation>();
  const evaluations: EngineEvaluation[] = [];

  try {
    const engine = getStockfishClient();
    await engine.beginGame();

    for (const fen of positions) {
      let evaluation = evaluationCache.get(fen);

      if (!evaluation) {
        evaluation = await engine.evaluateFen(fen, ENGINE_DEPTH);
        evaluationCache.set(fen, evaluation);
      }

      evaluations.push(evaluation);
    }
  } catch {
    throw new ChessAnalysisError(
      "engine_unavailable",
      500,
      "Stockfish analysis failed for this PGN.",
    );
  }

  const findings: AnalysisFinding[] = [];
  let totalCentipawnLoss = 0;

  for (const [index, move] of moves.entries()) {
    if (normalizedPerspective && move.color !== normalizedPerspective) {
      continue;
    }

    const moveNumber = Math.floor(index / 2) + 1;
    const beforeScore = evaluations[index].score;
    const afterScore = flipScorePerspective(evaluations[index + 1].score);
    const centipawnLoss = calculateCentipawnLoss(beforeScore, afterScore);
    totalCentipawnLoss += centipawnLoss;

    const classification = classifyCentipawnLoss(centipawnLoss);

    if (!classification) {
      continue;
    }

    findings.push({
      move_number: moveNumber,
      move: move.san,
      color: colorToPerspective(move.color),
      classification,
      centipawn_loss: centipawnLoss,
      description: describeFinding(classification, centipawnLoss, beforeScore, afterScore),
    });
  }

  const blunders = findings.filter(
    (finding) => finding.classification === "blunder",
  ).length;
  const mistakes = findings.filter(
    (finding) => finding.classification === "mistake",
  ).length;
  const inaccuracies = findings.filter(
    (finding) => finding.classification === "inaccuracy",
  ).length;
  const avgCentipawnLoss = Number(
    (totalCentipawnLoss / relevantMoves.length).toFixed(1),
  );

  return {
    total_moves: relevantMoves.length,
    blunders,
    mistakes,
    inaccuracies,
    avg_centipawn_loss: avgCentipawnLoss,
    summary: buildSummary({
      avgCentipawnLoss,
      blunders,
      mistakes,
      inaccuracies,
      findings,
      perspective: normalizedPerspective,
      totalMoves: relevantMoves.length,
    }),
    findings,
  };
}

function normalizePerspective(
  perspective?: AnalysisPerspective,
): InternalColor | undefined {
  if (perspective === "white") {
    return "w";
  }

  if (perspective === "black") {
    return "b";
  }

  return undefined;
}

function getStockfishClient() {
  if (!stockfishClient) {
    stockfishClient = new StockfishClient();
  }

  return stockfishClient;
}

function normalizeEngineLine(rawLine: string) {
  return rawLine.trim();
}

function parseInfoScore(line: string): ParsedInfoScore | null {
  if (!line.startsWith("info ")) {
    return null;
  }

  const scoreMatch = line.match(/\bscore (cp|mate) (-?\d+)/);
  const depthMatch = line.match(/\bdepth (\d+)/);

  if (!scoreMatch || !depthMatch) {
    return null;
  }

  return {
    depth: Number.parseInt(depthMatch[1], 10),
    score: {
      kind: scoreMatch[1] as ScoreKind,
      value: Number.parseInt(scoreMatch[2], 10),
    },
  };
}

function flipScorePerspective(score: EngineScore): EngineScore {
  return {
    kind: score.kind,
    value: score.value * -1,
  };
}

function calculateCentipawnLoss(before: EngineScore, after: EngineScore) {
  const loss = scoreToCentipawns(before) - scoreToCentipawns(after);
  return Math.min(1_000, Math.max(0, Math.round(loss)));
}

function scoreToCentipawns(score: EngineScore) {
  if (score.kind === "cp") {
    return score.value;
  }

  const distancePenalty = Math.min(
    Math.max(Math.abs(score.value) - 1, 0) * 25,
    MAX_MATE_DISTANCE_CP,
  );
  return Math.sign(score.value) * (MATE_SENTINEL_CP - distancePenalty);
}

function classifyCentipawnLoss(
  centipawnLoss: number,
): MoveClassification | undefined {
  if (centipawnLoss > 200) {
    return "blunder";
  }

  if (centipawnLoss > 100) {
    return "mistake";
  }

  if (centipawnLoss > 50) {
    return "inaccuracy";
  }

  return undefined;
}

function colorToPerspective(color: InternalColor): AnalysisPerspective {
  return color === "w" ? "white" : "black";
}

function describeFinding(
  classification: MoveClassification,
  centipawnLoss: number,
  before: EngineScore,
  after: EngineScore,
) {
  if (after.kind === "mate" && after.value < 0) {
    return `${capitalize(classification)}: this allows a forced mate in ${Math.abs(after.value)}.`;
  }

  if (before.kind === "mate" && before.value > 0 && after.kind !== "mate") {
    return `${capitalize(classification)}: this throws away a forced mate.`;
  }

  return `${capitalize(classification)}: the engine swing is ${formatScore(before)} to ${formatScore(after)} (${centipawnLoss} cp lost).`;
}

function formatScore(score: EngineScore) {
  if (score.kind === "mate") {
    return `${score.value > 0 ? "" : "-"}M${Math.abs(score.value)}`;
  }

  const pawns = score.value / 100;
  const prefix = pawns > 0 ? "+" : "";
  return `${prefix}${pawns.toFixed(1)}`;
}

function buildSummary({
  avgCentipawnLoss,
  blunders,
  mistakes,
  inaccuracies,
  findings,
  perspective,
  totalMoves,
}: {
  avgCentipawnLoss: number;
  blunders: number;
  mistakes: number;
  inaccuracies: number;
  findings: AnalysisFinding[];
  perspective?: InternalColor;
  totalMoves: number;
}) {
  const subject = perspective ? "You" : "This game";

  if (findings.length === 0) {
    return `${subject} stayed within 50 centipawns on all ${totalMoves} analyzed move${totalMoves === 1 ? "" : "s"}. Average centipawn loss: ${avgCentipawnLoss}.`;
  }

  const parts = [
    `${blunders} blunder${blunders === 1 ? "" : "s"}`,
    `${mistakes} mistake${mistakes === 1 ? "" : "s"}`,
    `${inaccuracies} inaccuracy${inaccuracies === 1 ? "" : "ies"}`,
  ];
  const worstFinding = findings.reduce((worst, finding) =>
    finding.centipawn_loss > worst.centipawn_loss ? finding : worst,
  );

  return `${subject} averaged ${avgCentipawnLoss} centipawns lost across ${totalMoves} analyzed move${totalMoves === 1 ? "" : "s"}. Breakdown: ${parts.join(", ")}. Biggest swing: move ${worstFinding.move_number} ${worstFinding.move} (${worstFinding.centipawn_loss} cp).`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
