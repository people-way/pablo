import type { AnalysisSaveResult, RepertoireReport } from "@/lib/openings/repertoire-types";

/** Shape accepted by the existing pablo_save_analysis RPC. No new table. */
export function toAnalysisSaveResult(report: RepertoireReport): AnalysisSaveResult {
  return {
    username: report.username,
    gameCount: report.gameCount,
    wins: report.wins,
    losses: report.losses,
    draws: report.draws,
    winRate: report.winRate,
    dateRange: report.dateRange,
    summary: report.summary,
    openings: report.families.map((family) => ({
      opening: family.opening.slice(0, 120),
      color: family.color,
      gameCount: family.gameCount,
      wins: family.wins,
      winRate: family.winRate,
    })),
  };
}
