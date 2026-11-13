-- Master calendar sync: a team name can be marked "not tracked" (for example Tee Ball, which has no
-- umpires). Games with a not-tracked team are skipped by the sync: not added, not held back, not listed.
-- Like other team matches it belongs to the season, and "Forget" undoes it.
--
-- Needs 20261113100000_add_calendar_feed_sync.sql. Safe to run twice.

begin;

alter table public.calendar_feed_names add column if not exists is_ignored boolean not null default false;

alter table public.calendar_feed_names drop constraint if exists calendar_feed_names_shape_valid;
alter table public.calendar_feed_names add constraint calendar_feed_names_shape_valid check (
  (kind = 'team' and season_id is not null and location_id is null
     and not (is_outside and is_ignored)
     and (is_outside or is_ignored) = (team_id is null))
  or (kind = 'field' and season_id is null and team_id is null and location_id is not null and not is_outside and not is_ignored)
);

-- the old version had no p_ignored; replaced (not overloaded) so calls by name stay unambiguous
drop function if exists public.save_calendar_feed_name(text, text, uuid, uuid, uuid, boolean);

-- "This name in the feed is that team / that field" (or, for a team, "an outside team" or "not tracked").
create or replace function public.save_calendar_feed_name(
  p_kind text,
  p_feed_name text,
  p_season_id uuid,
  p_team_id uuid,
  p_location_id uuid,
  p_outside boolean default false,
  p_ignored boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text := public.calendar_feed_key(p_feed_name);
  v_outside boolean := coalesce(p_outside, false);
  v_ignored boolean := coalesce(p_ignored, false);
  v_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;
  if not public.is_scheduling_admin() then
    raise exception 'Only scheduling administrators can match calendar names.';
  end if;
  if v_key = '' then
    raise exception 'The name is empty.';
  end if;

  if p_kind = 'team' then
    if p_season_id is null then
      raise exception 'Choose the season.';
    end if;
    if v_outside and v_ignored then
      raise exception 'A team is either an outside team or not tracked, not both.';
    end if;
    if not (v_outside or v_ignored) then
      if p_team_id is null then
        raise exception 'Choose the team.';
      end if;
      if not exists (select 1 from public.teams t where t.id = p_team_id and t.season_id = p_season_id) then
        raise exception 'That team is not in this season.';
      end if;
    end if;

    delete from public.calendar_feed_names
    where kind = 'team' and feed_key = v_key and season_id = p_season_id;

    insert into public.calendar_feed_names (kind, feed_key, feed_name, season_id, team_id, is_outside, is_ignored, created_by_name)
    values ('team', v_key, btrim(p_feed_name), p_season_id,
            case when v_outside or v_ignored then null else p_team_id end,
            v_outside, v_ignored, public.current_admin_name())
    returning id into v_id;

  elsif p_kind = 'field' then
    if v_outside or v_ignored then
      raise exception 'Only a team can be an outside team or not tracked.';
    end if;
    if p_location_id is null or not exists (select 1 from public.locations l where l.id = p_location_id) then
      raise exception 'Choose the field.';
    end if;

    delete from public.calendar_feed_names where kind = 'field' and feed_key = v_key;

    insert into public.calendar_feed_names (kind, feed_key, feed_name, location_id, created_by_name)
    values ('field', v_key, btrim(p_feed_name), p_location_id, public.current_admin_name())
    returning id into v_id;

  else
    raise exception 'Unknown kind of name "%".', p_kind;
  end if;

  return v_id;
end;
$$;

revoke all on function public.save_calendar_feed_name(text, text, uuid, uuid, uuid, boolean, boolean) from public, anon;
grant execute on function public.save_calendar_feed_name(text, text, uuid, uuid, uuid, boolean, boolean) to authenticated;

commit;
