-- Master calendar Game ID.
--
-- The umpire system holds a COPY of the league's master calendar. Each game
-- can carry the master calendar's own ID for that game, so that loading the
-- spreadsheet again UPDATES the games it already knows instead of adding
-- duplicates.
--
--   * optional: a game made by hand in the umpire system has no master ID
--   * stored exactly as given, but with no leading or trailing spaces
--   * unique WITHIN A SEASON (not globally), so the numbering may restart
--     each season in the master calendar without clashing
--
-- Existing games (there are none yet) are unaffected.

begin;

alter table public.games
  add column external_game_id text
    constraint games_external_id_valid
    check (
      external_game_id is null
      or (
        external_game_id = btrim(external_game_id)
        and char_length(external_game_id) between 1 and 100
      )
    );

create unique index games_season_external_id_unique
  on public.games (season_id, external_game_id)
  where external_game_id is not null;

commit;
