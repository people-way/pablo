import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  verifyMagicLinkToken,
  upsertUserByEmail,
  createSession,
  SESSION_COOKIE,
} from "@/lib/auth";

export const runtime = "nodejs";

const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const redirectTo = request.nextUrl.searchParams.get("redirect") || "/dashboard";

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=missing_token", request.url));
  }

  const verified = await verifyMagicLinkToken(token);
  if (!verified) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", request.url));
  }

  const user = await upsertUserByEmail(verified.email);
  const sessionToken = await createSession(user.id);

  const response = NextResponse.redirect(new URL(redirectTo, request.url));
  response.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return response;
}
