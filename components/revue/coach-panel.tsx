import { classLabel } from "@/lib/review/classify";
import { describePhase } from "@/lib/review/session";
import type { CoachingSession } from "@/lib/review/session";
import type { GamePhase } from "@/lib/review/explain";
import { classColor } from "./widgets";

export function CoachPanel({
  session,
  phase,
  onPick,
}: {
  session: CoachingSession;
  phase: GamePhase;
  onPick: (ply: number) => void;
}) {
  return (
    <section className="space-y-3 rounded-xl p-3" style={{ background: "var(--bg-secondary)" }} aria-label="Séance de coach">
      <div>
        <h3 className="text-sm font-semibold" style={{ color: "var(--gold-light)" }}>
          Séance
        </h3>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {describePhase(session.opening, phase)}
        </p>
      </div>

      {session.lessons.length === 3 ? (
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            3 leçons de la partie
            {session.partial ? " · bilan partiel" : ""}
          </h3>
          <ol className="mt-2 space-y-2">
            {session.lessons.map((lesson, index) => (
              <li key={lesson.title} className="text-sm leading-relaxed">
                <span className="font-semibold" style={{ color: "var(--gold)" }}>
                  {index + 1}. {lesson.title}.
                </span>{" "}
                <span style={{ color: "var(--text-secondary)" }}>{lesson.text}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Lance l&apos;analyse pour les 3 leçons et les moments clés.
        </p>
      )}

      {session.keyMoments.length > 0 ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Moments clés</h3>
          <ul className="flex flex-col gap-2">
            {session.keyMoments.map((moment) => (
              <li key={`${moment.ply}-${moment.label}`}>
                <button
                  type="button"
                  className="min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm"
                  style={{ border: "1px solid var(--border)", background: "var(--bg-card)" }}
                  onClick={() => onPick(moment.ply)}
                >
                  <span className="font-semibold" style={{ color: classColor(moment.classification) }}>
                    {moment.label} · {classLabel(moment.classification)}
                  </span>
                  <span className="mt-1 block leading-snug" style={{ color: "var(--text-secondary)" }}>
                    {moment.text}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
