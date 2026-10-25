-- Importing games from the master calendar spreadsheet.
--
-- The screen reads the spreadsheet, matches its names to the league's
-- divisions, teams and fields, works out which games are new and which have
-- changed, and shows the administrator a preview. Pressing "Import" then makes
-- ONE call to this function, which applies everything together:
--
--   * new teams and new fields the administrator chose to create
--   * new games
--   * changes to games that already exist (matched by the master Game ID)
--
-- ALL OR NOTHING. If any single row is refused (for example a team that is in
-- the wrong division), nothing at all is saved, and the message names the
-- game or team that caused it.
--
-- It runs with the CALLER'S OWN permissions (security invoker), so every
-- existing row-level rule still applies: only scheduling administrators can
-- write teams, fields and games, and the database's own rules about teams,
-- seasons, divisions and master Game IDs are enforced as usual.
--
-- Games that are already in the system but missing from the spreadsheet are
-- NOT touched: the screen only reports them.

begin;

create or replace function public.import_games(
  p_season_id uuid,
  p_new_teams jsonb,
  p_new_locations jsonb,
  p_games jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item jsonb;
  v_league uuid;
  v_rows integer;
  v_teams integer := 0;
  v_locations integer := 0;
  v_inserted integer := 0;
  v_updated integer := 0;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_scheduling_admin() then
    raise exception 'Only scheduling administrators can import games.';
  end if;

  if not exists (select 1 from public.seasons where id = p_season_id) then
    raise exception 'That season was not found.';
  end if;

  p_new_teams := coalesce(p_new_teams, '[]'::jsonb);
  p_new_locations := coalesce(p_new_locations, '[]'::jsonb);
  p_games := coalesce(p_games, '[]'::jsonb);

  if jsonb_typeof(p_new_teams) <> 'array'
     or jsonb_typeof(p_new_locations) <> 'array'
     or jsonb_typeof(p_games) <> 'array' then
    raise exception 'The import data is not in the expected form.';
  end if;

  if jsonb_array_length(p_games) > 5000
     or jsonb_array_length(p_new_teams) > 2000
     or jsonb_array_length(p_new_locations) > 500 then
    raise exception
      'This import is too large. The limits are 5000 games, 2000 new teams and 500 new fields.';
  end if;

  -- New fields first, then new teams, so the games can use them.
  for v_item in select value from jsonb_array_elements(p_new_locations) loop
    begin
      insert into public.locations (id, name)
      values ((v_item->>'id')::uuid, btrim(v_item->>'name'));

      v_locations := v_locations + 1;
    exception when others then
      raise exception 'The field "%" could not be added: %',
        v_item->>'name', sqlerrm using errcode = sqlstate;
    end;
  end loop;

  for v_item in select value from jsonb_array_elements(p_new_teams) loop
    begin
      select league_id into v_league
      from public.divisions
      where id = (v_item->>'division_id')::uuid;

      if v_league is null then
        raise exception 'its division was not found';
      end if;

      insert into public.teams (id, league_id, season_id, name, division_id)
      values (
        (v_item->>'id')::uuid,
        v_league,
        p_season_id,
        btrim(v_item->>'name'),
        (v_item->>'division_id')::uuid
      );

      v_teams := v_teams + 1;
    exception when others then
      raise exception 'The team "%" could not be added: %',
        v_item->>'name', sqlerrm using errcode = sqlstate;
    end;
  end loop;

  for v_item in select value from jsonb_array_elements(p_games) loop
    begin
      if v_item->>'op' = 'insert' then
        insert into public.games (
          season_id, division_id, game_type,
          home_team_id, away_team_id, home_label, away_label,
          location_id, starts_at, ends_at, status, external_game_id
        )
        values (
          p_season_id,
          (v_item->>'division_id')::uuid,
          'regular',
          nullif(v_item->>'home_team_id', '')::uuid,
          nullif(v_item->>'away_team_id', '')::uuid,
          nullif(btrim(coalesce(v_item->>'home_label', '')), ''),
          nullif(btrim(coalesce(v_item->>'away_label', '')), ''),
          (v_item->>'location_id')::uuid,
          (v_item->>'starts_at')::timestamptz,
          (v_item->>'ends_at')::timestamptz,
          coalesce(nullif(v_item->>'status', ''), 'scheduled'),
          nullif(btrim(coalesce(v_item->>'external_game_id', '')), '')
        );

        v_inserted := v_inserted + 1;

      elsif v_item->>'op' = 'update' then
        -- The status is only changed when the spreadsheet says something
        -- about it; notes and the master Game ID are never touched.
        update public.games
        set division_id = (v_item->>'division_id')::uuid,
            home_team_id = nullif(v_item->>'home_team_id', '')::uuid,
            away_team_id = nullif(v_item->>'away_team_id', '')::uuid,
            home_label = nullif(btrim(coalesce(v_item->>'home_label', '')), ''),
            away_label = nullif(btrim(coalesce(v_item->>'away_label', '')), ''),
            location_id = (v_item->>'location_id')::uuid,
            starts_at = (v_item->>'starts_at')::timestamptz,
            ends_at = (v_item->>'ends_at')::timestamptz,
            status = coalesce(nullif(v_item->>'status', ''), status)
        where id = (v_item->>'id')::uuid
          and season_id = p_season_id;

        get diagnostics v_rows = row_count;

        if v_rows = 0 then
          raise exception 'that game was not found in this season';
        end if;

        v_updated := v_updated + 1;

      else
        raise exception 'unknown operation "%"', v_item->>'op';
      end if;
    exception when others then
      raise exception 'Game "%" could not be imported: %',
        coalesce(v_item->>'external_game_id', v_item->>'id', '?'),
        sqlerrm using errcode = sqlstate;
    end;
  end loop;

  return jsonb_build_object(
    'teams_created', v_teams,
    'locations_created', v_locations,
    'games_inserted', v_inserted,
    'games_updated', v_updated
  );
end;
$$;

revoke all on function public.import_games(uuid, jsonb, jsonb, jsonb)
from public, anon;

grant execute on function public.import_games(uuid, jsonb, jsonb, jsonb)
to authenticated;

commit;
