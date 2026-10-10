import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";
import {
  normalizeChessComUsername,
  safeRedirectPath,
} from "./account-guards";

export { normalizeChessComUsername, safeRedirectPath };

export type User = {
  id: string;
  email: string;
  chess_com_username: string | null;
  created_at: string;
  last_seen: string;
};

type ProfileRow = {
  id: string;
  email: string;
  chess_com_username: string | null;
  created_at: string;
  last_seen: string;
};

export class AccountStorageError extends Error {
  constructor(message = "Account storage is unavailable.") {
    super(message);
    this.name = "AccountStorageError";
  }
}

function isAuthRejection(error: { name?: string; status?: number; message?: string }): boolean {
  if (error.status === 400 || error.status === 401 || error.status === 403) return true;
  const name = error.name ?? "";
  return name.startsWith("Auth");
}

function asProfile(row: ProfileRow): User {
  return {
    id: row.id,
    email: row.email,
    chess_com_username: row.chess_com_username,
    created_at: row.created_at,
    last_seen: row.last_seen,
  };
}

async function readIdentity(
  supabase: SupabaseClient,
): Promise<{ id: string; email: string } | null> {
  const claimsResult = await supabase.auth.getClaims();
  if (claimsResult.error) {
    if (isAuthRejection(claimsResult.error)) return null;
    throw new AccountStorageError(claimsResult.error.message);
  }
  const claims = claimsResult.data?.claims;
  const id = typeof claims?.sub === "string" ? claims.sub : "";
  if (!id) return null;

  let email = typeof claims?.email === "string" ? claims.email : "";
  if (!email) {
    const userResult = await supabase.auth.getUser();
    if (userResult.error) {
      if (isAuthRejection(userResult.error)) return null;
      throw new AccountStorageError(userResult.error.message);
    }
    email = userResult.data.user?.email ?? "";
  }
  return { id, email };
}

async function ensureProfile(
  supabase: SupabaseClient,
  identity: { id: string; email: string },
): Promise<User> {
  const existing = await supabase
    .from("pablo_profiles")
    .select("id, email, chess_com_username, created_at, last_seen")
    .eq("id", identity.id)
    .maybeSingle();
  if (existing.error) throw new AccountStorageError(existing.error.message);

  if (existing.data) {
    const row = existing.data as ProfileRow;
    if (identity.email && row.email !== identity.email) {
      const updated = await supabase
        .from("pablo_profiles")
        .update({ email: identity.email })
        .eq("id", identity.id)
        .select("id, email, chess_com_username, created_at, last_seen")
        .single();
      if (updated.error) throw new AccountStorageError(updated.error.message);
      return asProfile(updated.data as ProfileRow);
    }
    return asProfile(row);
  }

  const inserted = await supabase
    .from("pablo_profiles")
    .insert({ id: identity.id, email: identity.email })
    .select("id, email, chess_com_username, created_at, last_seen")
    .single();
  if (!inserted.error && inserted.data) {
    return asProfile(inserted.data as ProfileRow);
  }

  const raced = await supabase
    .from("pablo_profiles")
    .select("id, email, chess_com_username, created_at, last_seen")
    .eq("id", identity.id)
    .maybeSingle();
  if (raced.error || !raced.data) {
    throw new AccountStorageError(inserted.error?.message || raced.error?.message || "Profile missing");
  }
  return asProfile(raced.data as ProfileRow);
}

/** Verified Supabase session plus the Pablo profile. Null when nobody is logged in. */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const identity = await readIdentity(supabase);
  if (!identity) return null;
  return ensureProfile(supabase, identity);
}

export async function updateChessUsername(username: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("pablo_set_chess_username", {
    p_username: username,
  });
  if (error) throw new AccountStorageError(error.message);
}
