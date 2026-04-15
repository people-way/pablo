import type { NextRequest } from "next/server";
import { createMagicLinkToken } from "@/lib/auth";
import { execSync } from "child_process";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) {
    return Response.json({ error: "Valid email required" }, { status: 400 });
  }

  const token = await createMagicLinkToken(email);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://pablo.nanocorp.app";
  const magicLink = `${baseUrl}/api/auth/verify?token=${token}`;

  // Send email via nanocorp CLI
  const subject = "Your Pablo login link";
  const bodyText = `Hi,\n\nClick this link to log in to Pablo (expires in 15 minutes):\n\n${magicLink}\n\nIf you didn't request this, ignore this email.\n\n— Pablo`;

  try {
    const cmd = `nanocorp emails send --to "${email}" --from "pablo@nanocorp.app" --subject "${subject}" --body "${bodyText.replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
    execSync(cmd, { timeout: 10000 });
  } catch (err) {
    console.error("Failed to send magic link email:", err);
    // Still return success to avoid email enumeration, but log the error
  }

  return Response.json({ ok: true });
}
