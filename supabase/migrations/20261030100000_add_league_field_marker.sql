-- A marker on each field: does this league run it, or do our teams travel to it?
--
-- locations.is_league_field
--   true  = a field this league runs (our home fields)
--   false = a field our teams travel to (an away field)
--
-- Fields that already exist are set to TRUE, because most of the fields entered
-- so far are the league's own; change any away fields in Administration, then
-- Locations. Fields created from now on default to FALSE (for example, a new
-- field that appears in a game import is more likely an away field), and the
-- Add location form in the app starts with the box ticked.
--
-- Who can change it is the same as for the rest of a location: scheduling
-- administrators.

begin;

alter table public.locations
  add column is_league_field boolean not null default true;

alter table public.locations
  alter column is_league_field set default false;

commit;
