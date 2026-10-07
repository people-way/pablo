import { sanLine } from "./parse";
import { assessMove } from "./classify";
import { sideToMove, terminalEval, toWhiteView } from "./scores";
import type { MoveAnalysis, NodeEval, ParsedMove } from "./types";

export class ReviewCancelled extends Error {
  constructor() {
    super("Analyse interrompue.");
    this.name = "ReviewCancelled";
  }
}

export type PositionSearch = {
  bestUci: string | null;
  cp: number | null;
  mate: number | null;
  pvUci: string[];
};

export type GameAnalysis = {
  analyses: Array<MoveAnalysis | null>;
  nodeEvals: NodeEval[];
};

export async function analyzeGame(input: {
  startFen: string;
  moves: ParsedMove[];
  search: (fen: string) => Promise<PositionSearch>;
  shouldStop?: () => boolean;
  onProgress?: (update: {
    done: number;
    total: number;
    analyses: Array<MoveAnalysis | null>;
    nodeEvals: Array<NodeEval | null>;
  }) => void;
}): Promise<GameAnalysis> {
  const fens = [input.startFen, ...input.moves.map((move) => move.fenAfter)];
  const total = fens.length;
  const searches: Array<PositionSearch | null> = [];
  const nodeEvals: Array<NodeEval | null> = Array.from({ length: total }, () => null);
  const analyses: Array<MoveAnalysis | null> = Array.from({ length: input.moves.length }, () => null);

  for (let index = 0; index < fens.length; index += 1) {
    if (input.shouldStop?.()) {
      throw new ReviewCancelled();
    }

    const fen = fens[index];
    const finished = terminalEval(fen);
    const side = sideToMove(fen);
    let searchResult: PositionSearch;

    if (finished) {
      searchResult = {
        bestUci: null,
        cp: side === "w" ? finished.cp : -finished.cp,
        mate: null,
        pvUci: [],
      };
      nodeEvals[index] = finished;
    } else {
      searchResult = await input.search(fen);
      nodeEvals[index] = toWhiteView(searchResult, side);
    }

    searches.push(searchResult);

    if (index > 0) {
      const move = input.moves[index - 1];
      const before = nodeEvals[index - 1];
      const after = nodeEvals[index];
      const previous = searches[index - 1];

      if (before && after && previous) {
        const assessment = assessMove({
          color: move.color,
          playedUci: move.uci,
          bestUci: previous.bestUci,
          before,
          after,
        });
        const bestSan = previous.bestUci ? sanLine(move.fenBefore, [previous.bestUci]) : "";

        analyses[index - 1] = {
          ply: move.ply,
          color: move.color,
          classification: assessment.classification,
          cpLoss: assessment.cpLoss,
          accuracy: assessment.accuracy,
          bestUci: previous.bestUci,
          bestSan: bestSan || null,
          pvSan: sanLine(move.fenBefore, previous.pvUci),
          before,
          after,
        };
      }
    }

    input.onProgress?.({
      done: index + 1,
      total,
      analyses: analyses.slice(),
      nodeEvals: nodeEvals.slice(),
    });
  }

  return {
    analyses,
    nodeEvals: nodeEvals.map((evaluation) => evaluation ?? { cp: 0, mate: null }),
  };
}
