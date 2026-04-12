import {
  analyzePgn,
  ChessAnalysisError,
  type AnalysisPerspective,
} from "@/lib/chess-analysis";

type AnalyzeRequestBody = {
  pgn?: unknown;
  perspective?: unknown;
};

export async function POST(request: Request) {
  let payload: AnalyzeRequestBody;

  try {
    payload = (await request.json()) as AnalyzeRequestBody;
  } catch {
    return Response.json(
      {
        error: {
          code: "invalid_json",
          message: "Send a JSON body like {\"pgn\":\"...\"}.",
        },
      },
      { status: 400 },
    );
  }

  const pgn = typeof payload.pgn === "string" ? payload.pgn : "";
  const perspective = toPerspective(payload.perspective);

  try {
    const report = analyzePgn(pgn, perspective);

    return Response.json(report);
  } catch (error) {
    if (error instanceof ChessAnalysisError) {
      return Response.json(
        {
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: error.status },
      );
    }

    return Response.json(
      {
        error: {
          code: "internal_error",
          message: "Something went wrong while analyzing the PGN.",
        },
      },
      { status: 500 },
    );
  }
}

function toPerspective(value: unknown): AnalysisPerspective | undefined {
  if (value === "white" || value === "black") {
    return value;
  }

  return undefined;
}
