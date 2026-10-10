import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";

/** Browser client. PKCE verifiers are stored in cookies so the callback can finish login. */
export function createClient() {
  const env = supabaseEnv();
  if (!env) {
    throw new Error("Supabase is not configured.");
  }
  return createBrowserClient(env.url, env.publishableKey);
}
