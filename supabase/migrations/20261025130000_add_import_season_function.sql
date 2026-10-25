-- Creating a season, its divisions and its teams from a registration file.
--
-- The screen reads the registration system's "Team Detail" (and optionally
-- "Division Details") spreadsheet, matches its names to the league's own, and
-- shows a preview. Pressing "Create" then makes ONE call to this function,
-- which applies everything together:
--
--   * a NEW season, or (when the person chose one) an existing season to
--     which teams are added
--   * the divisions that do not exist yet in the league
--   * the teams that do not exist yet
--
-- ALL OR NOTHING. If anything is refused (a season or division or team name
-- that already exists, a team in the wrong league's division, ...), nothing at
-- all is saved, and the message names what caused it.
--
-- It runs with the CALLER'S OWN permissions (security invoker), so the
-- existing rules still apply: only scheduling administrators can write
-- seasons, divisions and teams, and every database rule about names and about
-- a team's division belonging to the team's league is enforced as usual.
--
-- An existing season is never changed (its name and dates are left alone);
-- only teams are added to it. Existing divisions and teams are never changed.

begin;

create or replace function public.import_season(
  p_league_id uuid,
  p_season jsonb,
  p_divisions jsonb,
  p_teams jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item jsonb;
  v_name text;
  v_season_id uuid;
  v_season_created boolean := false;
  v_divisions integer := 0;
  v_teams integer := 0;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_scheduling_admin() then
    raise exception 'Only scheduling administrators can import a season.';
  end if;

  if not exists (select 1 from public.leagues where id = p_league_id) then
    raise exception 'That league was not found.';
  end if;

  p_season := coalesce(p_season, '{}'::jsonb);
  p_divisions := coalesce(p_divisions, '[]'::jsonb);
  p_teams := coalesce(p_teams, '[]'::jsonb);

  if jsonb_typeof(p_season) <> 'object'
     or jsonb_typeof(p_divisions) <> 'array'
     or jsonb_typeof(p_teams) <> 'array' then
    raise exception 'The import data is not in the expected form.';
  end if;

  if jsonb_array_length(p_divisions) > 200
     or jsonb_array_length(p_teams) > 2000 then
    raise exception
      'This import is too large. The limits are 200 divisions and 2000 teams.';
  end if;

  -- The season: an existing one (teams are added to it), or a new one.
  if nullif(p_season->>'id', '') is not null then
    v_season_id := (p_season->>'id')::uuid;

    if not exists (select 1 from public.seasons where id = v_season_id) then
      raise exception 'That season was not found.';
    end if;
  else
    v_name := btrim(coalesce(p_season->>'name', ''));

    if v_name = '' then
      raise exception 'The season needs a name.';
    end if;

    begin
      insert into public.seasons (name, starts_on, ends_on)
      values (
        v_name,
        nullif(p_season->>'starts_on', '')::date,
        nullif(p_season->>'ends_on', '')::date
      )
      returning id into v_season_id;

      v_season_created := true;
    exception when others then
      raise exception 'The season "%" could not be created: %',
        v_name, sqlerrm using errcode = sqlstate;
    end;
  end if;

  -- New divisions, then new teams (which may belong to them).
  for v_item in select value from jsonb_array_elements(p_divisions) loop
    begin
      v_name := btrim(coalesce(v_item->>'name', ''));

      if v_name = '' then
        raise exception 'the name is empty';
      end if;

      insert into public.divisions (id, league_id, name)
      values ((v_item->>'id')::uuid, p_league_id, v_name);

      v_divisions := v_divisions + 1;
    exception when others then
      raise exception 'The division "%" could not be added: %',
        coalesce(v_item->>'name', '?'), sqlerrm using errcode = sqlstate;
    end;
  end loop;

  for v_item in select value from jsonb_array_elements(p_teams) loop
    begin
      v_name := btrim(coalesce(v_item->>'name', ''));

      if v_name = '' then
        raise exception 'the name is empty';
      end if;

      insert into public.teams (id, league_id, season_id, name, division_id)
      values (
        (v_item->>'id')::uuid,
        p_league_id,
        v_season_id,
        v_name,
        (v_item->>'division_id')::uuid
      );

      v_teams := v_teams + 1;
    exception when others then
      raise exception 'The team "%" could not be added: %',
        coalesce(v_item->>'name', '?'), sqlerrm using errcode = sqlstate;
    end;
  end loop;

  return jsonb_build_object(
    'season_id', v_season_id,
    'season_created', v_season_created,
    'divisions_created', v_divisions,
    'teams_created', v_teams
  );
end;
$$;

revoke all on function public.import_season(uuid, jsonb, jsonb, jsonb)
from public, anon;

grant execute on function public.import_season(uuid, jsonb, jsonb, jsonb)
to authenticated;

commit;
