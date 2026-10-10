import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  verifyMagicLinkToken,
  upsertUserByEmail,
  createSession,
  SESSION_COOKIE,
  safeRedirectPath,
  sessionCookieOptions,
} from "@/lib/auth";
import { accountsConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!accountsConfigured()) {
    return NextResponse.redirect(new URL("/login?error=accounts", request.url));
  }

  const token = request.nextUrl.searchParams.get("token");
  const redirectTo = safeRedirectPath(request.nextUrl.searchParams.get("redirect"));

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing_token", request.url));
  }

  let verified: { email: string } | null;
  try {
    verified = await verifyMagicLinkToken(token);
  } catch (error) {
    console.error("Magic link verification failed", error instanceof Error ? error.message : "");
    return NextResponse.redirect(new URL("/login?error=storage", request.url));
  }

  if (!verified) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", request.url));
  }

  let sessionToken: string;
  try {
    const user = await upsertUserByEmail(verified.email);
    sessionToken = await createSession(user.id);
  } catch (error) {
    console.error("Session creation failed", error instanceof Error ? error.message : "");
    return NextResponse.redirect(new URL("/login?error=storage", request.url));
  }

  const response = NextResponse.redirect(new URL(redirectTo, request.url));
  response.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions());
  return response;
}
