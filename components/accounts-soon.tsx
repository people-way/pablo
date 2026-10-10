import Link from "next/link";
import { ACCOUNTS_SOON_MESSAGE, ACCOUNTS_SOON_TITLE } from "@/lib/accounts-copy";

export function AccountsSoon() {
  return (
    <div className="w-full max-w-md mx-auto text-center">
      <div
        className="mb-6 text-5xl"
        style={{ color: "var(--gold)", filter: "drop-shadow(0 0 16px rgba(201,168,76,0.5))" }}
      >
        ♞
      </div>
      <h1
        className="text-3xl font-bold mb-4"
        style={{ fontFamily: "var(--font-playfair), serif" }}
      >
        {ACCOUNTS_SOON_TITLE}
      </h1>
      <p className="text-base leading-7 mb-8" style={{ color: "var(--text-secondary)" }}>
        {ACCOUNTS_SOON_MESSAGE}
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/revue"
          className="btn-gold rounded-2xl px-6 py-3 text-sm font-bold"
          style={{ color: "#0a0b0c" }}
        >
          Revue de partie
        </Link>
        <Link
          href="/analyze"
          className="rounded-2xl border px-6 py-3 text-sm font-bold"
          style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
        >
          Analyser des ouvertures
        </Link>
      </div>
    </div>
  );
}
