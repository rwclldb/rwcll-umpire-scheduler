-- Rules for teams and games, added BEFORE any game screens exist, while the
-- games table is still empty and these changes are cheap and safe.
--
-- RULE 1  A team's division must belong to the team's own league.
--         (The Teams screen already offers only that league's divisions;
--         this makes the database enforce it too.)
--
-- RULE 2  Games are ready for schedules, tournaments and brackets:
--           * every game belongs to a DIVISION
--           * both teams must be in the game's SEASON and in its DIVISION
--           * a side can be an undecided bracket slot ("Winner of Game 3")
--             instead of a team, using a short label
--           * a game has a type: regular, tournament, or scrimmage
--           * the "last changed" time is kept by the database
--
-- Not done here on purpose: stopping two games at the same field and time.
-- The games screen will WARN about that (a hard block would be too strict
-- for real leagues).
--
-- This stops with a clear message, and changes nothing, if the data does not
-- fit (for example if games already exist, or a team is in another league's
-- division).

begin;

-- 0. Safety checks -------------------------------------------------------
do $$
declare
  v_bad integer;
begin
  select count(*) into v_bad
  from public.teams t
  join public.divisions d on d.id = t.division_id
  where d.league_id <> t.league_id;

  if v_bad > 0 then
    raise exception
      '% team(s) are in a division that belongs to a different league. Fix them in League Setup, then run this again.', v_bad;
  end if;

  if exists (select 1 from public.games) then
    raise exception
      'The games table already contains games. Every game now needs a division, so this change must be planned by hand. Ask Claude.';
  end if;
end
$$;

-- 1. RULE 1: a team's division belongs to the team's league -----------------
alter table public.divisions
  add constraint divisions_id_league_unique unique (id, league_id);

alter table public.teams
  add constraint teams_division_in_same_league
  foreign key (division_id, league_id)
  references public.divisions (id, league_id)
  on delete restrict;

-- 2. RULE 2: games --------------------------------------------------------
-- Targets for the games rules below.
alter table public.teams
  add constraint teams_id_season_unique unique (id, season_id),
  add constraint teams_id_division_unique unique (id, division_id);

alter table public.games
  alter column home_team_id drop not null,
  alter column away_team_id drop not null,
  add column division_id uuid not null
    references public.divisions(id) on delete restrict,
  add column game_type text not null default 'regular'
    constraint games_type_valid
    check (game_type in ('regular', 'tournament', 'scrimmage')),
  add column home_label text,
  add column away_label text;

alter table public.games
  -- each side is EITHER a team OR a bracket label, never both, never neither
  add constraint games_home_side_valid
    check ((home_team_id is null) <> (home_label is null)),
  add constraint games_away_side_valid
    check ((away_team_id is null) <> (away_label is null)),
  add constraint games_labels_valid
    check (
      (home_label is null or char_length(btrim(home_label)) between 1 and 100)
      and (away_label is null or char_length(btrim(away_label)) between 1 and 100)
    ),
  -- both teams must be in the game's season and in the game's division
  add constraint games_home_team_in_season
    foreign key (home_team_id, season_id)
    references public.teams (id, season_id),
  add constraint games_away_team_in_season
    foreign key (away_team_id, season_id)
    references public.teams (id, season_id),
  add constraint games_home_team_in_division
    foreign key (home_team_id, division_id)
    references public.teams (id, division_id),
  add constraint games_away_team_in_division
    foreign key (away_team_id, division_id)
    references public.teams (id, division_id);

create index games_division_idx on public.games (division_id);

-- 3. The database keeps "last changed" up to date -----------------------------
create trigger games_set_updated_at
before update on public.games
for each row execute function public.set_updated_at();

create trigger umpire_availability_set_updated_at
before update on public.umpire_availability
for each row execute function public.set_updated_at();

commit;
