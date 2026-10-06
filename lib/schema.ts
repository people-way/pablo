/**
 * Idempotent account schema. Applied on the first query when DATABASE_URL is set.
 * Existing tables are left in place (`IF NOT EXISTS`).
 */
export const SCHEMA_SQL = `
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  chess_com_username TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS magic_link_tokens (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS magic_link_tokens_email_idx ON magic_link_tokens (email);

CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chess_com_username TEXT NOT NULL,
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_games INTEGER NOT NULL,
  wins INTEGER NOT NULL,
  losses INTEGER NOT NULL,
  draws INTEGER NOT NULL,
  win_rate INTEGER NOT NULL,
  date_range_from TEXT,
  date_range_to TEXT,
  opening_breakdown JSONB,
  pablo_summary TEXT
);

CREATE INDEX IF NOT EXISTS analyses_user_run_idx ON analyses (user_id, run_at DESC);

CREATE TABLE IF NOT EXISTS opening_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chess_com_username TEXT NOT NULL,
  opening_family TEXT NOT NULL,
  color TEXT NOT NULL,
  games_played INTEGER NOT NULL,
  wins INTEGER NOT NULL,
  win_rate INTEGER NOT NULL,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, chess_com_username, opening_family, color)
);

DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS opening_stats_identity_idx
    ON opening_stats (user_id, chess_com_username, opening_family, color);
EXCEPTION WHEN others THEN
  RAISE NOTICE 'opening_stats unique index skipped: %', SQLERRM;
END $$;
`;
