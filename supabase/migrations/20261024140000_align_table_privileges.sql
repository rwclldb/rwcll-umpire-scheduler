-- Align table privileges with the live project (least privilege).
--
-- A newly created Supabase project automatically gives anon and
-- authenticated extra privileges (REFERENCES, TRIGGER, TRUNCATE) on
-- every new table. The older migrations never revoked them, so a
-- database rebuilt from these files ended up with more access than the
-- live project. TRUNCATE in particular is not limited by row-level
-- security.
--
-- This resets the 12 older tables to exactly the privileges the live
-- project has: nothing for anon, and for authenticated only what the
-- row-level security policies then narrow down.
--
-- On the live project this changes nothing (it already has exactly
-- these privileges), so it is safe to run there too.
--
-- The three newest tables (age charts, age chart entries, umpire
-- private details) already revoke everything first and are untouched.

begin;

revoke all on table
  public.profiles,
  public.roles,
  public.user_roles,
  public.umpires,
  public.leagues,
  public.seasons,
  public.divisions,
  public.teams,
  public.locations,
  public.games,
  public.game_assignments,
  public.umpire_availability
from public, anon, authenticated;

-- Read-only reference data and accounts.
grant select on table public.profiles to authenticated;
grant select on table public.roles to authenticated;

-- Role assignments: no UPDATE (a role is granted or revoked).
grant select, insert, delete on table public.user_roles to authenticated;

-- Everything else: row-level security policies decide who may do what.
grant select, insert, update, delete on table
  public.umpires,
  public.leagues,
  public.seasons,
  public.divisions,
  public.teams,
  public.locations,
  public.games,
  public.game_assignments,
  public.umpire_availability
to authenticated;

commit;
