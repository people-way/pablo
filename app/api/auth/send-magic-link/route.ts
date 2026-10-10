import { execFileSync } from "node:child_process";
import type { NextRequest } from "next/server";
import {
  createMagicLinkToken,
  isAuthBypassEnabled,
  safeRedirectPath,
} from "@/lib/auth";
import { accountsUnavailableResponse } from "@/lib/accounts-response";
import { accountsConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Magic-link login.
 *
 * Email delivery uses the NanoCorp CLI:
 *   nanocorp emails send --to ... --from pablo@nanocorp.app --subject ... --body ...
 *
 * Required for a real account:
 *   DATABASE_URL          Postgres connection string
 *   NEXT_PUBLIC_BASE_URL  public origin baked into emailed links (falls back to the request origin)
 *
 * If the CLI is missing or send fails:
 *   - NODE_ENV=development, or PABLO_AUTH_BYPASS=1: response includes a one-time login link
 *   - otherwise: 503 with a clear error. The bypass is never implied in production without the flag.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function storageErrorMessage(error: unknown): string | null {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("DATABASE_URL")) return message;
  if (
    /ECONNREFUSED|ENOTFOUND|password authentication|does not exist|connect/i.test(
      message,
    )
  ) {
    return "Account storage is unavailable. Set DATABASE_URL to a Postgres database.";
  }
  return null;
}

function trySendEmail(to: string, subject: string, body: string): boolean {
  try {
    execFileSync(
      "nanocorp",
      [
        "emails",
        "send",
        "--to",
        to,
        "--from",
        "pablo@nanocorp.app",
        "--subject",
        subject,
        "--body",
        body,
      ],
      { timeout: 15000, stdio: ["ignore", "pipe", "pipe"] },
    );
    return true;
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code)
        : "unknown";
    console.error("nanocorp emails send failed", { code });
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!accountsConfigured()) {
    return accountsUnavailableResponse();
  }

  let body: { email?: unknown; redirect?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !EMAIL_RE.test(email)) {
    return Response.json({ error: "Valid email required" }, { status: 400 });
  }

  const redirect = safeRedirectPath(body.redirect);
  let token: string;
  try {
    token = await createMagicLinkToken(email);
  } catch (error) {
    console.error("Failed to create magic link token");
    return Response.json(
      {
        error:
          storageErrorMessage(error) ??
          "Couldn't start login. Try again in a moment.",
        code: "storage_unavailable",
      },
      { status: 503 },
    );
  }

  const configuredOrigin = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "");
  const emailOrigin = configuredOrigin || request.nextUrl.origin;
  const redirectQuery = encodeURIComponent(redirect);
  const emailedLink = `${emailOrigin}/api/auth/verify?token=${token}&redirect=${redirectQuery}`;
  const bypassLink = `${request.nextUrl.origin}/api/auth/verify?token=${token}&redirect=${redirectQuery}`;

  const subject = "Your Pablo login link";
  const bodyText = `Hi,\n\nClick this link to log in to Pablo (expires in 15 minutes):\n\n${emailedLink}\n\nIf you didn't request this, ignore this email.\n\n— Pablo`;

  const sent = trySendEmail(email, subject, bodyText);
  if (sent) {
    return Response.json({ ok: true, delivered: "email" });
  }

  if (isAuthBypassEnabled()) {
    return Response.json({
      ok: true,
      delivered: "bypass",
      magicLink: bypassLink,
    });
  }

  return Response.json(
    {
      error:
        "Couldn't send the login email. This server needs the nanocorp CLI (`nanocorp emails send`). Set PABLO_AUTH_BYPASS=1 only on a private preview if you need a login link without email. That bypass stays off in production unless the flag is set.",
      code: "email_unavailable",
    },
    { status: 503 },
  );
}
