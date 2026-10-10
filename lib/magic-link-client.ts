import { AUTH_NEXT_COOKIE, safeRedirectPath } from "./account-guards";
import {
  ACCOUNTS_SOON_MESSAGE,
  ACCOUNTS_SOON_TITLE,
  ACCOUNTS_UNAVAILABLE_CODE,
} from "./accounts-copy";
import { createClient } from "./supabase/client";
import { accountsConfigured } from "./supabase/env";

export type MagicLinkResponse = {
  ok?: boolean;
  delivered?: "email";
  error?: string;
  code?: string;
};

export async function requestMagicLink(
  email: string,
  redirect: string,
): Promise<MagicLinkResponse> {
  if (!accountsConfigured()) {
    return {
      ok: false,
      code: ACCOUNTS_UNAVAILABLE_CODE,
      error: `${ACCOUNTS_SOON_TITLE}. ${ACCOUNTS_SOON_MESSAGE}`,
    };
  }

  const next = safeRedirectPath(redirect);
  const redirectTo = new URL("/auth/callback", window.location.origin);
  redirectTo.searchParams.set("next", next);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${AUTH_NEXT_COOKIE}=${encodeURIComponent(next)}; Path=/; Max-Age=3600; SameSite=Lax${secure}`;

  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo.toString(),
        shouldCreateUser: true,
      },
    });
    if (error) {
      return {
        ok: false,
        error: error.message || "Couldn't send the login email.",
      };
    }
    return { ok: true, delivered: "email" };
  } catch {
    return { ok: false, error: "Couldn't reach the login service. Try again." };
  }
}
