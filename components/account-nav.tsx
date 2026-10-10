"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SessionUser = {
  email: string;
  chess_com_username: string | null;
} | null;

function useSessionUser() {
  const [user, setUser] = useState<SessionUser>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((data: { user?: SessionUser }) => {
        if (!cancelled) setUser(data.user ?? null);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, ready };
}

const linkClass = "text-sm transition-colors hover:text-amber-400";

export function AccountLinks() {
  const { user, ready } = useSessionUser();

  return (
    <div className="flex items-center gap-3 sm:gap-5" style={{ color: "var(--text-secondary)" }}>
      <Link href="/analyze" className={linkClass}>
        Analyze
      </Link>
      <Link href="/revue" className={linkClass}>
        Revue
      </Link>
      <Link href="/dashboard" className={linkClass}>
        Dashboard
      </Link>
      {!ready || !user ? (
        <Link href="/login" className={linkClass}>
          Login
        </Link>
      ) : null}
    </div>
  );
}

export function AccountNav() {
  const { user, ready } = useSessionUser();

  return (
    <header
      className="fixed top-0 inset-x-0 z-50"
      style={{
        background: "rgba(10,11,12,0.88)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 shrink-0"
          style={{
            color: "var(--gold-light)",
            fontFamily: "var(--font-playfair), serif",
            fontWeight: 700,
          }}
        >
          <span style={{ color: "var(--gold)" }}>♞</span>
          Pablo
        </Link>
        <nav className="flex items-center gap-3 sm:gap-5" style={{ color: "var(--text-secondary)" }}>
          <Link href="/analyze" className={linkClass}>
            Analyze
          </Link>
          <Link href="/revue" className={linkClass}>
            Revue
          </Link>
          <Link href="/dashboard" className={linkClass}>
            Dashboard
          </Link>
          {!ready || !user ? (
            <Link href="/login" className={linkClass}>
              Login
            </Link>
          ) : null}
          {ready && user ? (
            <Link href="/dashboard" className={linkClass} style={{ color: "var(--gold)" }}>
              {user.chess_com_username || "Account"}
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
