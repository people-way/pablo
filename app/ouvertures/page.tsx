import type { Metadata } from "next";
import { Suspense } from "react";
import { CoachApp } from "@/components/ouvertures/coach-app";

export const metadata: Metadata = {
  title: "Coach d'ouvertures — Pablo",
  description:
    "Le répertoire réel Chess.com : lignes jouées, score, sortie de théorie, et un échiquier pour les rejouer.",
};

export default function OuverturesPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen px-6 pt-24" style={{ background: "var(--bg-primary)", color: "var(--text-secondary)" }}>
          Chargement du coach…
        </main>
      }
    >
      <CoachApp />
    </Suspense>
  );
}
