import type { Metadata } from "next";
import { RevueApp } from "@/components/revue/revue-app";

export const metadata: Metadata = {
  title: "Revue — Pablo",
  description:
    "Analyse une partie ou une position avec Stockfish dans le navigateur, sans compte.",
};

export default function RevuePage() {
  return <RevueApp />;
}
