import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "./env";

/**
 * Refresh the Supabase session cookie. Public pages, including /revue, stay public:
 * a missing session is not a redirect.
 */
export async function updateSession(request: NextRequest) {
  const env = supabaseEnv();
  if (!env) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([key, value]) => {
          supabaseResponse.headers.set(key, value);
        });
      },
    },
  });

  // getClaims validates the JWT and refreshes it when it is close to expiry.
  // A Supabase outage must not take down /revue or the opening report.
  try {
    await supabase.auth.getClaims();
  } catch (error) {
    console.error(
      "Supabase session refresh failed",
      error instanceof Error ? error.message : "",
    );
  }

  return supabaseResponse;
}
