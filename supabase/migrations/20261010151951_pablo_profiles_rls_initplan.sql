-- Keep auth.jwt() inside its own scalar subquery so the planner caches it
-- once per statement. Replaces the policy from 20261010151332_pablo_init.

drop policy if exists pablo_profiles_own on public.pablo_profiles;

create policy pablo_profiles_own
  on public.pablo_profiles
  for all
  to authenticated
  using ((select auth.uid()) = id)
  with check (
    (select auth.uid()) = id
    and email = coalesce(((select auth.jwt()) ->> 'email'), '')
  );
