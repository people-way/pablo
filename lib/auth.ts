import { cookies } from "next/headers";
import { query, queryOne } from "./db";
import crypto from "crypto";

export const SESSION_COOKIE = "pablo_session";
const SESSION_DAYS = 30;
const MAGIC_LINK_MINUTES = 15;

export type User = {
  id: string;
  email: string;
  chess_com_username: string | null;
  created_at: string;
  last_seen: string;
};

// ─── Session helpers ──────────────────────────────────────────────────────────

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createSession(userId: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await query(
    "INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)",
    [token, userId, expiresAt],
  );
  return token;
}

export async function getSessionUser(token: string): Promise<User | null> {
  const row = await queryOne<User>(
    `SELECT u.id, u.email, u.chess_com_username, u.created_at, u.last_seen
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > NOW()`,
    [token],
  );
  return row;
}

export async function deleteSession(token: string): Promise<void> {
  await query("DELETE FROM sessions WHERE token = $1", [token]);
}

// ─── Magic link helpers ───────────────────────────────────────────────────────

export async function createMagicLinkToken(email: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + MAGIC_LINK_MINUTES * 60 * 1000);
  // Invalidate any existing unused tokens for this email
  await query(
    "UPDATE magic_link_tokens SET used = TRUE WHERE email = $1 AND used = FALSE",
    [email],
  );
  await query(
    "INSERT INTO magic_link_tokens (token, email, expires_at) VALUES ($1, $2, $3)",
    [token, email, expiresAt],
  );
  return token;
}

export async function verifyMagicLinkToken(
  token: string,
): Promise<{ email: string } | null> {
  const row = await queryOne<{ email: string }>(
    "SELECT email FROM magic_link_tokens WHERE token = $1 AND expires_at > NOW() AND used = FALSE",
    [token],
  );
  if (!row) return null;
  await query("UPDATE magic_link_tokens SET used = TRUE WHERE token = $1", [
    token,
  ]);
  return row;
}

// ─── User helpers ─────────────────────────────────────────────────────────────

export async function upsertUserByEmail(
  email: string,
): Promise<User> {
  const existing = await queryOne<User>(
    "SELECT id, email, chess_com_username, created_at, last_seen FROM users WHERE email = $1",
    [email],
  );
  if (existing) {
    await query("UPDATE users SET last_seen = NOW() WHERE id = $1", [existing.id]);
    existing.last_seen = new Date().toISOString();
    return existing;
  }
  const rows = await query<User>(
    "INSERT INTO users (email) VALUES ($1) RETURNING id, email, chess_com_username, created_at, last_seen",
    [email],
  );
  return rows[0];
}

export async function updateChessUsername(
  userId: string,
  username: string,
): Promise<void> {
  await query(
    "UPDATE users SET chess_com_username = $1, last_seen = NOW() WHERE id = $2",
    [username, userId],
  );
}

// ─── Server-side session reader ───────────────────────────────────────────────

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    return await getSessionUser(token);
  } catch {
    return null;
  }
}
