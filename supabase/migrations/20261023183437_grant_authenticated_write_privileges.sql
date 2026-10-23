-- Allow RLS policies to control who can modify umpire records.
grant insert, update, delete
on table public.umpires
to authenticated;

-- Allow RLS policies to control reference-data management.
grant insert, update, delete
on table public.leagues
to authenticated;

grant insert, update, delete
on table public.seasons
to authenticated;

grant insert, update, delete
on table public.teams
to authenticated;

grant insert, update, delete
on table public.locations
to authenticated;

-- Allow RLS policies to control role assignments.
grant insert, delete
on table public.user_roles
to authenticated;