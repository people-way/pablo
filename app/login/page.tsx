"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AccountNav } from "@/components/account-nav";
import { AccountsSoon } from "@/components/accounts-soon";
import { ACCOUNTS_UNAVAILABLE_CODE } from "@/lib/accounts-copy";
import { requestMagicLink } from "@/lib/magic-link-client";

function queryErrorMessage(error: string | null) {
  if (error === "invalid_token") {
    return "That link has expired or already been used. Enter your email to get a new one.";
  }
  if (error === "missing_token") {
    return "Invalid login link. Enter your email below.";
  }
  if (error === "storage") {
    return "Account storage is unavailable right now. Analysis and game review still work.";
  }
  return "";
}

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const redirect = searchParams.get("redirect") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [formError, setFormError] = useState("");
  const [bypassLink, setBypassLink] = useState<string | null>(null);
  const [accountsAvailable, setAccountsAvailable] = useState<boolean | null>(
    error === "accounts" ? false : null,
  );
  const errorMsg = formError || queryErrorMessage(error);

  useEffect(() => {
    if (error === "accounts") return;
    let cancelled = false;
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((data: { accountsAvailable?: boolean }) => {
        if (!cancelled) setAccountsAvailable(data.accountsAvailable !== false);
      })
      .catch(() => {
        if (!cancelled) setAccountsAvailable(true);
      });
    return () => {
      cancelled = true;
    };
  }, [error]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setFormError("Enter a valid email address.");
      return;
    }
    setFormError("");
    setBypassLink(null);
    setStatus("sending");
    try {
      const data = await requestMagicLink(trimmed, redirect);
      if (data.code === ACCOUNTS_UNAVAILABLE_CODE) {
        setAccountsAvailable(false);
        setStatus("idle");
        return;
      }
      if (!data.ok) {
        setFormError(data.error || "Something went wrong. Try again.");
        setStatus("error");
        return;
      }
      if (data.delivered === "bypass" && data.magicLink) {
        setBypassLink(data.magicLink);
      }
      setStatus("sent");
    } catch {
      setFormError("Couldn't reach the server. Check your connection.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="w-full max-w-md mx-auto text-center animate-fadeInUp" style={{ opacity: 0 }}>
        <div
          className="mb-6 text-5xl"
          style={{ color: "var(--gold)", filter: "drop-shadow(0 0 16px rgba(201,168,76,0.5))" }}
        >
          ♞
        </div>
        <h2
          className="text-3xl font-bold mb-4"
          style={{ fontFamily: "var(--font-playfair), serif" }}
        >
          {bypassLink ? "Login link ready" : "Check your email"}
        </h2>
        {bypassLink ? (
          <>
            <p className="text-base leading-7 mb-6" style={{ color: "var(--text-secondary)" }}>
              Email can&apos;t be sent in this environment. This one-time link works in development,
              or when <code>PABLO_AUTH_BYPASS=1</code> is set. It is not returned in production
              without that flag.
            </p>
            <a
              href={bypassLink}
              className="btn-gold inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-bold mb-6"
              style={{ color: "#0a0b0c" }}
            >
              Continue to your account
            </a>
          </>
        ) : (
          <p className="text-base leading-7 mb-6" style={{ color: "var(--text-secondary)" }}>
            Pablo sent a login link to <strong style={{ color: "var(--text-primary)" }}>{email}</strong>.
            Click the link in that email to log in. It expires in 15 minutes.
          </p>
        )}
        <button
          onClick={() => { setStatus("idle"); setEmail(""); }}
          className="text-sm underline"
          style={{ color: "var(--text-muted)" }}
        >
          Use a different email
        </button>
      </div>
    );
  }

  if (accountsAvailable === false) {
    return <AccountsSoon />;
  }

  if (accountsAvailable === null) {
    return (
      <div className="text-5xl" style={{ color: "var(--gold)" }} aria-hidden>
        ♞
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto animate-fadeInUp" style={{ opacity: 0 }}>
      {/* Pablo branding */}
      <div className="mb-8 flex items-center gap-3">
        <span
          style={{
            fontSize: "2.2rem",
            color: "var(--gold)",
            filter: "drop-shadow(0 0 12px rgba(201,168,76,0.5))",
          }}
        >
          ♞
        </span>
        <span
          className="text-xs font-bold tracking-[0.35em] uppercase"
          style={{ color: "var(--gold)" }}
        >
          Pablo
        </span>
      </div>

      <h1
        className="text-4xl font-bold mb-3"
        style={{ fontFamily: "var(--font-playfair), serif" }}
      >
        Create free account
      </h1>
      <p className="text-base leading-7 mb-8" style={{ color: "var(--text-secondary)" }}>
        Track your opening improvement over time. No credit card, no password — just your email.
      </p>

      {errorMsg && (
        <div
          className="mb-5 rounded-2xl border p-4"
          style={{
            borderColor: "rgba(224,97,97,0.28)",
            background: "rgba(60,15,15,0.9)",
          }}
        >
          <p className="text-sm leading-6" style={{ color: "#ffcaca" }}>{errorMsg}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setFormError(""); }}
          placeholder="you@example.com"
          aria-label="Email"
          autoComplete="email"
          className="w-full rounded-2xl border px-5 py-4 text-base outline-none transition-all"
          style={{
            borderColor: "var(--border-gold)",
            background: "rgba(14,16,19,0.9)",
            color: "var(--text-primary)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--gold-dim)";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(201,168,76,0.12)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--border-gold)";
            e.currentTarget.style.boxShadow = "";
          }}
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="btn-gold w-full rounded-2xl py-4 text-base font-bold tracking-wide"
          style={{ color: "#0a0b0c", opacity: status === "sending" ? 0.7 : 1 }}
        >
          {status === "sending" ? "Sending link..." : "Send me a login link"}
        </button>
      </form>

      <p className="mt-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
        We&apos;ll email you a magic link — no password needed.
      </p>

      <div className="mt-8 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
        <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>
          Already tracking your progress?{" "}
          <button
            onClick={() => {}} // same form works for login
            className="underline"
            style={{ color: "var(--text-secondary)" }}
          >
            Use the same form above
          </button>
        </p>
        <p className="mt-3 text-xs text-center" style={{ color: "var(--text-muted)" }}>
          <Link href="/analyze" className="underline">Run a free analysis first →</Link>
          {" · "}
          <Link href="/revue" className="underline">Revue de partie →</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div
      className="chess-pattern min-h-screen flex items-center justify-center px-6 pt-24 pb-16"
      style={{ background: "var(--bg-primary)" }}
    >
      <AccountNav />
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
