import { createServerClient } from "@supabase/ssr";
import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { AUTH_NEXT_COOKIE, safeRedirectPath } from "@/lib/account-guards";
import { supabaseEnv } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

function loginRedirect(request: NextRequest, error: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const env = supabaseEnv();
  if (!env) {
    return loginRedirect(request, "accounts");
  }

  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const typeParam = request.nextUrl.searchParams.get("type");
  const type = OTP_TYPES.has(typeParam as EmailOtpType) ? (typeParam as EmailOtpType) : null;
  const providerError = request.nextUrl.searchParams.get("error");

  if (providerError) {
    return loginRedirect(request, "invalid_token");
  }
  if (!code && !(tokenHash && type)) {
    return loginRedirect(request, "missing_token");
  }

  const nextPath = safeRedirectPath(
    request.nextUrl.searchParams.get("next") ??
      request.cookies.get(AUTH_NEXT_COOKIE)?.value,
  );
  const successUrl = request.nextUrl.clone();
  successUrl.pathname = nextPath;
  successUrl.search = "";

  const response = NextResponse.redirect(successUrl);
  response.cookies.set(AUTH_NEXT_COOKIE, "", { path: "/", maxAge: 0 });

  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return loginRedirect(request, "invalid_token");
    return response;
  }

  const { error } = await supabase.auth.verifyOtp({
    type: type!,
    token_hash: tokenHash!,
  });
  if (error) return loginRedirect(request, "invalid_token");
  return response;
}
