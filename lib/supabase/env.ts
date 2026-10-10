/** Public Supabase settings. Safe to import from client and server code. */
export function supabaseEnv(): { url: string; publishableKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
  if (!url || !publishableKey) return null;
  if (!/^https?:\/\//.test(url)) return null;
  return { url, publishableKey };
}

/** Account pages stay on “Compte bientôt disponible” until both variables are set. */
export function accountsConfigured(): boolean {
  return supabaseEnv() !== null;
}
