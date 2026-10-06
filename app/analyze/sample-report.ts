import type { OpeningsAnalysisResult } from "@/app/api/analyze/openings/route";

/**
 * Static club-player report for /analyze?sample=1.
 * Stays local so the landing-page demo does not depend on Chess.com.
 */
export const sampleOpeningReport: OpeningsAnalysisResult = {
  username: "sample",
  gameCount: 24,
  wins: 9,
  losses: 12,
  draws: 3,
  winRate: 38,
  dateRange: {
    from: "2026-01-04T12:00:00.000Z",
    to: "2026-03-28T12:00:00.000Z",
  },
  weaknesses: [
    {
      opening: "Italian Game",
      color: "white",
      winRate: 22,
      gameCount: 9,
      diagnosis:
        "The Italian as White is where the points are going. 22% across 9 games means the bishop reaches c4 and then the plan runs out. Opponents who know the next three moves are the ones leaving with the win.",
      keyProblem:
        "Development looks finished, but f7 is loose and the center never gets a decision. Pieces trade without a reason, and the position turns tactical before a plan exists.",
      whatToDo:
        "Play one Italian setup for a week: castle, c3, d3, knight to d2, then choose d4 only when the pieces are ready. Stop inventing a new move order every game.",
    },
    {
      opening: "Sicilian Defense",
      color: "black",
      winRate: 29,
      gameCount: 7,
      diagnosis:
        "The Sicilian as Black is the second leak. 29% across 7 games. c5 gets played, then the position is treated like a quiet king's pawn game. Black's counterplay has a timetable, and these games miss it.",
      keyProblem:
        "The kingside develops and waits. White's pawn storm arrives while the queenside pieces are still on their starting squares.",
      whatToDo:
        "Name the break before move 8: ...d5 when the center is soft, or ...b5 when White castles long. If the break isn't clear, play a different defense that day.",
    },
    {
      opening: "London System",
      color: "white",
      winRate: 40,
      gameCount: 5,
      diagnosis:
        "The London as White looks safe and still scores 40% across 5 games. The same setup every time is the trap. Opponents have seen the bishop on f4 before, and they know the queenside pressure that follows.",
      keyProblem:
        "The system reaches move 10, then ...c5 and ...Qb6 show up with no answer. Defending b2 becomes the game, and the queenside slips away.",
      whatToDo:
        "Add one decision to the London before you play it again: meet ...c5 with c3, and know in advance whether e4 is the break or the center stays closed.",
    },
  ],
  summary:
    "Twenty-four games, 38% wins. Two openings are doing most of the damage: the Italian as White at 22%, and the Sicilian as Black at 29%. The London is a slower leak. This is not a talent problem. It is the same missing plan, repeated. One focused week on the worst opening would move the scoreline. This sample is the free report — a Chess.com username gets the same read. — Pablo",
};
