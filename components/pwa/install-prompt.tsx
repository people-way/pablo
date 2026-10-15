"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "pablo.pwa.install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function dismissedForever() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberDismissal() {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // Private mode still hides the prompt for this visit.
  }
}

function runningStandalone() {
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    nav.standalone === true
  );
}

function iosSafari() {
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua);
  const safari = /safari/i.test(ua) && !/crios|fxios|edgios|chrome|android/i.test(ua);
  return ios && safari;
}

export function PwaInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // The site keeps working as a normal tab when registration fails.
      });
    }

    if (dismissedForever()) return;

    const standaloneMedia = window.matchMedia("(display-mode: standalone)");

    function onPrompt(event: Event) {
      event.preventDefault();
      if (runningStandalone()) return;
      setPromptEvent(event as BeforeInstallPromptEvent);
    }

    function hideWhenInstalled() {
      if (!standaloneMedia.matches) return;
      setPromptEvent(null);
      setIosHint(false);
    }

    window.addEventListener("beforeinstallprompt", onPrompt);
    standaloneMedia.addEventListener("change", hideWhenInstalled);
    const frame = window.requestAnimationFrame(() => {
      if (runningStandalone()) return;
      if (iosSafari()) setIosHint(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      standaloneMedia.removeEventListener("change", hideWhenInstalled);
    };
  }, []);

  const visible = promptEvent !== null || iosHint;
  if (!visible) return null;

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setPromptEvent(null);
    if (choice.outcome === "accepted") rememberDismissal();
  }

  function dismiss() {
    rememberDismissal();
    setPromptEvent(null);
    setIosHint(false);
  }

  return (
    <div
      role="region"
      aria-label="Installer Pablo"
      data-pwa-install
      style={{
        position: "fixed",
        zIndex: 70,
        left: "50%",
        bottom: "max(12px, env(safe-area-inset-bottom))",
        transform: "translateX(-50%)",
        width: "min(420px, calc(100% - 24px))",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "10px 12px",
        borderRadius: "14px",
        background: "rgba(17, 19, 22, 0.96)",
        border: "1px solid rgba(201, 168, 76, 0.35)",
        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.45)",
        color: "#f0ede8",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.92rem", fontWeight: 700, letterSpacing: "-0.01em" }}>
          Installer Pablo
        </div>
        {iosHint && !promptEvent ? (
          <p style={{ margin: "2px 0 0", fontSize: "0.78rem", lineHeight: 1.4, color: "#9a9289" }}>
            Dans Safari : Partager, puis Sur l&apos;écran d&apos;accueil.
          </p>
        ) : (
          <p style={{ margin: "2px 0 0", fontSize: "0.78rem", lineHeight: 1.4, color: "#9a9289" }}>
            Plein écran, sur l&apos;écran d&apos;accueil.
          </p>
        )}
      </div>
      {promptEvent ? (
        <button
          type="button"
          onClick={() => {
            void install();
          }}
          className="btn-gold"
          style={{
            color: "#0a0b0c",
            border: 0,
            borderRadius: "10px",
            padding: "8px 12px",
            fontSize: "0.82rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Installer
        </button>
      ) : null}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fermer définitivement"
        style={{
          background: "transparent",
          color: "#9a9289",
          border: 0,
          padding: "8px",
          fontSize: "1.1rem",
          lineHeight: 1,
          cursor: "pointer",
        }}
      >
        ×
      </button>
    </div>
  );
}
