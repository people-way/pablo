-- Pablo account data on the shared Anarchik Games project.
-- Tables live in public with a pablo_ prefix so they show up in the Data API
-- without exposing an extra schema. The publishable key plus the user session
-- is enough: RLS restricts every row to auth.uid(). No service role is used.

create schema if not exists pablo_private;

revoke all on schema pablo_private from public;
revoke all on schema pablo_private from anon, authenticated;

comment on schema pablo_private is
  'Pablo helpers that must not be exposed through the Data API.';

-- ─── Tables ──────────────────────────────────────────────────────────────────

create table public.pablo_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  chess_com_username text,
  created_at timestamptz not null default pg_catalog.now(),
  last_seen timestamptz not null default pg_catalog.now(),
  constraint pablo_profiles_username_format check (
    chess_com_username is null
    or (
      chess_com_username ~ '^[A-Za-z0-9_-]{3,25}$'
      and lower(chess_com_username) not in ('pablo-sample', 'sample')
    )
  )
);

comment on table public.pablo_profiles is
  'Pablo: one profile per Supabase auth user (Chess.com username lives here).';

create table public.pablo_analyses (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  user_id uuid not null references public.pablo_profiles (id) on delete cascade,
  chess_com_username text not null,
  run_at timestamptz not null default pg_catalog.now(),
  total_games integer not null,
  wins integer not null,
  losses integer not null,
  draws integer not null,
  win_rate integer not null,
  date_range_from text,
  date_range_to text,
  opening_breakdown jsonb,
  pablo_summary text,
  constraint pablo_analyses_username_format check (
    chess_com_username ~ '^[A-Za-z0-9_-]{3,25}$'
    and lower(chess_com_username) not in ('pablo-sample', 'sample')
  ),
  constraint pablo_analyses_counts_nonnegative check (
    total_games >= 0
    and wins >= 0
    and losses >= 0
    and draws >= 0
    and win_rate >= 0
    and win_rate <= 100
  )
);

comment on table public.pablo_analyses is
  'Pablo: saved opening analyses. Sample reports are rejected before insert.';

create index pablo_analyses_user_run_idx
  on public.pablo_analyses (user_id, run_at desc);

create index pablo_analyses_dedupe_idx
  on public.pablo_analyses (user_id, chess_com_username, run_at desc);

create table public.pablo_opening_stats (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  user_id uuid not null references public.pablo_profiles (id) on delete cascade,
  chess_com_username text not null,
  opening_family text not null,
  color text not null,
  games_played integer not null,
  wins integer not null,
  win_rate integer not null,
  last_updated timestamptz not null default pg_catalog.now(),
  constraint pablo_opening_stats_identity unique (user_id, chess_com_username, opening_family, color),
  constraint pablo_opening_stats_color check (color in ('white', 'black')),
  constraint pablo_opening_stats_username_format check (
    chess_com_username ~ '^[A-Za-z0-9_-]{3,25}$'
    and lower(chess_com_username) not in ('pablo-sample', 'sample')
  ),
  constraint pablo_opening_stats_counts_nonnegative check (
    games_played >= 0
    and wins >= 0
    and win_rate >= 0
    and win_rate <= 100
  )
);

comment on table public.pablo_opening_stats is
  'Pablo: latest opening results per user, Chess.com username, family, and color.';

-- ─── Privileges ──────────────────────────────────────────────────────────────

revoke all on table public.pablo_profiles from public, anon, authenticated;
revoke all on table public.pablo_analyses from public, anon, authenticated;
revoke all on table public.pablo_opening_stats from public, anon, authenticated;

grant select, insert, update on table public.pablo_profiles to authenticated;
grant select, insert, update, delete on table public.pablo_analyses to authenticated;
grant select, insert, update, delete on table public.pablo_opening_stats to authenticated;

alter table public.pablo_profiles enable row level security;
alter table public.pablo_analyses enable row level security;
alter table public.pablo_opening_stats enable row level security;

alter table public.pablo_profiles force row level security;
alter table public.pablo_analyses force row level security;
alter table public.pablo_opening_stats force row level security;

-- (select auth.uid()) is evaluated once per statement, not once per row.
create policy pablo_profiles_own
  on public.pablo_profiles
  for all
  to authenticated
  using ((select auth.uid()) = id)
  with check (
    (select auth.uid()) = id
    and email = coalesce(((select auth.jwt()) ->> 'email'), '')
  );

create policy pablo_analyses_own
  on public.pablo_analyses
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy pablo_opening_stats_own
  on public.pablo_opening_stats
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ─── Profile mirror ──────────────────────────────────────────────────────────

create or replace function pablo_private.handle_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.pablo_profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

comment on function pablo_private.handle_auth_user() is
  'Creates or refreshes the Pablo profile when an auth user is created or changes email.';

revoke all on function pablo_private.handle_auth_user() from public, anon, authenticated;

create trigger pablo_on_auth_user_created
  after insert on auth.users
  for each row
  execute function pablo_private.handle_auth_user();

create trigger pablo_on_auth_user_email_updated
  after update of email on auth.users
  for each row
  when (new.email is distinct from old.email)
  execute function pablo_private.handle_auth_user();

-- ─── Save analysis (dedupe 20s + opening stats + username fill) ──────────────

create or replace function public.pablo_save_analysis(
  p_chess_username text,
  p_total_games integer,
  p_wins integer,
  p_losses integer,
  p_draws integer,
  p_win_rate integer,
  p_date_range_from text,
  p_date_range_to text,
  p_opening_breakdown jsonb,
  p_summary text,
  p_openings jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  analysis_id uuid;
  opening_row record;
  opening_name text;
  opening_color text;
  games_text text;
  wins_text text;
  rate_text text;
  games_played integer;
  opening_wins integer;
  opening_rate integer;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_chess_username is null
    or p_chess_username !~ '^[A-Za-z0-9_-]{3,25}$'
    or lower(p_chess_username) in ('pablo-sample', 'sample') then
    raise exception 'invalid username' using errcode = '22023';
  end if;

  if p_total_games is null or p_total_games < 0
    or p_wins is null or p_wins < 0
    or p_losses is null or p_losses < 0
    or p_draws is null or p_draws < 0
    or p_win_rate is null or p_win_rate < 0 or p_win_rate > 100 then
    raise exception 'invalid analysis counts' using errcode = '22023';
  end if;

  insert into public.pablo_profiles (id, email)
  values (uid, coalesce((select auth.jwt() ->> 'email'), ''))
  on conflict (id) do nothing;

  -- Same key as the previous Postgres advisory lock: user + summary + game count.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(
      uid::text || ':' || coalesce(p_summary, '') || ':' || p_total_games::text
    )::bigint
  );

  select id
    into analysis_id
  from public.pablo_analyses
  where user_id = uid
    and chess_com_username = p_chess_username
    and coalesce(pablo_summary, '') = coalesce(p_summary, '')
    and total_games = p_total_games
    and run_at > pg_catalog.now() - interval '20 seconds'
  order by run_at desc
  limit 1;

  if analysis_id is null then
    insert into public.pablo_analyses (
      user_id,
      chess_com_username,
      total_games,
      wins,
      losses,
      draws,
      win_rate,
      date_range_from,
      date_range_to,
      opening_breakdown,
      pablo_summary
    )
    values (
      uid,
      p_chess_username,
      p_total_games,
      p_wins,
      p_losses,
      p_draws,
      p_win_rate,
      p_date_range_from,
      p_date_range_to,
      p_opening_breakdown,
      coalesce(p_summary, '')
    )
    returning id into analysis_id;
  end if;

  for opening_row in
    select value
    from pg_catalog.jsonb_array_elements(coalesce(p_openings, '[]'::jsonb)) as t(value)
  loop
    if pg_catalog.jsonb_typeof(opening_row.value) is distinct from 'object' then
      continue;
    end if;

    opening_name := btrim(opening_row.value ->> 'opening');
    opening_color := opening_row.value ->> 'color';
    games_text := opening_row.value ->> 'gameCount';
    wins_text := opening_row.value ->> 'wins';
    rate_text := opening_row.value ->> 'winRate';

    if opening_name is null
      or char_length(opening_name) < 1
      or char_length(opening_name) > 120
      or opening_color not in ('white', 'black')
      or games_text is null or games_text !~ '^[0-9]+$'
      or wins_text is null or wins_text !~ '^[0-9]+$'
      or rate_text is null or rate_text !~ '^[0-9]+$' then
      continue;
    end if;

    games_played := games_text::integer;
    opening_wins := wins_text::integer;
    opening_rate := rate_text::integer;

    if games_played <= 0 or opening_rate > 100 then
      continue;
    end if;

    insert into public.pablo_opening_stats (
      user_id,
      chess_com_username,
      opening_family,
      color,
      games_played,
      wins,
      win_rate
    )
    values (
      uid,
      p_chess_username,
      opening_name,
      opening_color,
      games_played,
      opening_wins,
      opening_rate
    )
    on conflict (user_id, chess_com_username, opening_family, color)
    do update set
      games_played = excluded.games_played,
      wins = excluded.wins,
      win_rate = excluded.win_rate,
      last_updated = pg_catalog.now();
  end loop;

  update public.pablo_profiles
  set
    chess_com_username = case
      when chess_com_username is null then p_chess_username
      else chess_com_username
    end,
    last_seen = pg_catalog.now()
  where id = uid;

  return analysis_id;
end;
$$;

comment on function public.pablo_save_analysis(
  text, integer, integer, integer, integer, integer, text, text, jsonb, text, jsonb
) is
  'Pablo: save an opening analysis, skip a duplicate from the last 20 seconds, and refresh opening stats.';

revoke all on function public.pablo_save_analysis(
  text, integer, integer, integer, integer, integer, text, text, jsonb, text, jsonb
) from public, anon, authenticated;

grant execute on function public.pablo_save_analysis(
  text, integer, integer, integer, integer, integer, text, text, jsonb, text, jsonb
) to authenticated;

-- ─── Rename Chess.com username and move history with it ─────────────────────

create or replace function public.pablo_set_chess_username(p_username text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_username is null
    or p_username !~ '^[A-Za-z0-9_-]{3,25}$'
    or lower(p_username) in ('pablo-sample', 'sample') then
    raise exception 'invalid username' using errcode = '22023';
  end if;

  update public.pablo_profiles
  set chess_com_username = p_username,
      last_seen = pg_catalog.now()
  where id = uid;

  update public.pablo_analyses
  set chess_com_username = p_username
  where user_id = uid;

  update public.pablo_opening_stats
  set chess_com_username = p_username,
      last_updated = pg_catalog.now()
  where user_id = uid;
end;
$$;

comment on function public.pablo_set_chess_username(text) is
  'Pablo: set the Chess.com username and move saved analyses and opening stats onto it.';

revoke all on function public.pablo_set_chess_username(text) from public, anon, authenticated;
grant execute on function public.pablo_set_chess_username(text) to authenticated;
