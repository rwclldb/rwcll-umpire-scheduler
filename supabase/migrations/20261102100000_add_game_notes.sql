-- Game notes: a short log of day-of notes on each game.
--
-- WHO CAN DO WHAT
--   Add a note   scheduling administrators (super admin, umpire chief, scheduler)
--                and the umpires assigned to that game
--   Read notes   administrators (including read-only), and the umpires assigned
--                to that game (all the notes on it, not just their own)
--   Remove one   scheduling administrators only
--   Edit one     nobody (a note is a record: remove it and add another)
--   Nobody writes this table directly: notes are added and removed only through
--   add_game_note and delete_game_note.
--
-- A note records who wrote it (their name as it was at the time, so it still
-- reads properly if they are later renamed or removed) and when. It uses the
-- demo clock's pretend time when that is switched on (see app_now).
--
-- LIMITS   1 to 1000 characters; at most 100 notes on one game.

begin;

create table public.game_notes (
  id uuid primary key default gen_random_uuid(),

  game_id uuid not null
    references public.games(id) on delete cascade,

  author_id uuid
    references auth.users(id) on delete set null,

  author_name text not null,
  body text not null,
  created_at timestamptz not null default now(),

  constraint game_notes_body_valid
    check (char_length(btrim(body)) between 1 and 1000),
  constraint game_notes_author_name_valid
    check (char_length(btrim(author_name)) > 0)
);

create index game_notes_game_idx
  on public.game_notes (game_id, created_at);

alter table public.game_notes enable row level security;

revoke all on table public.game_notes from public, anon, authenticated;
grant select on table public.game_notes to authenticated;

create policy "Admins and the umpires on a game can read its notes"
on public.game_notes
for select
to authenticated
using (
  public.is_approved_admin()
  or exists (
    select 1
    from public.game_assignments ga
    where ga.game_id = game_notes.game_id
      and ga.umpire_id = public.my_umpire_id()
  )
);

-- ------------------------------------------------------------ add a note
create or replace function public.add_game_note(
  p_game_id uuid,
  p_body text,
  p_now timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_name text;
  v_body text;
  v_count bigint;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select coalesce(nullif(btrim(p.display_name), ''), p.email)
  into v_name
  from public.profiles p
  where p.id = v_uid
    and p.account_status = 'approved';

  if v_name is null then
    raise exception 'You need an approved account to add a note.';
  end if;

  if not exists (select 1 from public.games g where g.id = p_game_id) then
    raise exception 'That game does not exist.';
  end if;

  if not (
    public.is_scheduling_admin()
    or exists (
      select 1
      from public.game_assignments ga
      where ga.game_id = p_game_id
        and ga.umpire_id = public.my_umpire_id()
    )
  ) then
    raise exception 'Only the umpires on a game and scheduling administrators can add notes to it.';
  end if;

  -- (all whitespace around the note is removed, including new lines)
  v_body := regexp_replace(coalesce(p_body, ''), '^\s+|\s+$', '', 'g');

  if v_body is null or v_body = '' then
    raise exception 'A note cannot be empty.';
  end if;

  if char_length(v_body) > 1000 then
    raise exception 'A note can be at most 1000 characters.';
  end if;

  select count(*) into v_count from public.game_notes where game_id = p_game_id;

  if v_count >= 100 then
    raise exception 'That game already has the most notes allowed (100).';
  end if;

  insert into public.game_notes (game_id, author_id, author_name, body, created_at)
  values (p_game_id, v_uid, v_name, v_body, public.app_now(p_now));
end;
$$;

revoke all on function public.add_game_note(uuid, text, timestamptz) from public, anon;
grant execute on function public.add_game_note(uuid, text, timestamptz) to authenticated;

-- --------------------------------------------------------- remove a note
create or replace function public.delete_game_note(p_note_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_scheduling_admin() then
    raise exception 'Only scheduling administrators can remove notes.';
  end if;

  delete from public.game_notes where id = p_note_id;

  if not found then
    raise exception 'That note does not exist.';
  end if;
end;
$$;

revoke all on function public.delete_game_note(uuid) from public, anon;
grant execute on function public.delete_game_note(uuid) to authenticated;

commit;
