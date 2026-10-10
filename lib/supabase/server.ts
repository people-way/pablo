import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";

/** Server client for Route Handlers, Server Components, and Server Actions. */
export async function createClient() {
  const env = supabaseEnv();
  if (!env) {
    throw new Error("Supabase is not configured.");
  }
  const cookieStore = await cookies();
  return createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies. The proxy refreshes the session.
        }
      },
    },
  });
}
