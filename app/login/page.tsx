"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const redirect = searchParams.get("redirect") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (error === "invalid_token") {
      setErrorMsg("That link has expired or already been used. Enter your email to get a new one.");
    } else if (error === "missing_token") {
      setErrorMsg("Invalid login link. Enter your email below.");
    }
  }, [error]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setErrorMsg("Enter a valid email address.");
      return;
    }
    setErrorMsg("");
    setStatus("sending");
    try {
      const res = await fetch("/api/auth/send-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, redirect }),
      });
      if (!res.ok) {
        setErrorMsg("Something went wrong. Try again.");
        setStatus("error");
        return;
      }
      setStatus("sent");
    } catch {
      setErrorMsg("Couldn't reach the server. Check your connection.");
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
          Check your email
        </h2>
        <p className="text-base leading-7 mb-6" style={{ color: "var(--text-secondary)" }}>
          Pablo sent a login link to <strong style={{ color: "var(--text-primary)" }}>{email}</strong>.
          Click the link in that email to log in. It expires in 15 minutes.
        </p>
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
          onChange={(e) => { setEmail(e.target.value); setErrorMsg(""); }}
          placeholder="you@example.com"
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
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div
      className="chess-pattern min-h-screen flex items-center justify-center px-6 py-16"
      style={{ background: "var(--bg-primary)" }}
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
