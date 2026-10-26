-- Umpire availability: a few limits, and speed.
--
-- WHAT AVAILABILITY MEANS
--   Each row says "this umpire CAN umpire between these two times". An umpire
--   who has entered some availability is taken to be unavailable at every other
--   time; one who has entered none is simply "no availability on file".
--   Umpires manage their own rows; scheduling administrators manage anyone's;
--   an umpire cannot see another umpire's rows (these rules already existed).
--
-- THIS MIGRATION ADDS
--   * a note can be at most 200 characters,
--   * one entry can cover at most 90 days (this stops a typo such as the wrong
--     year from creating an entry that lasts for years), and
--   * indexes, so looking up an umpire's entries, or every entry still to come,
--     stays fast.

begin;

alter table public.umpire_availability
  add constraint umpire_availability_notes_valid
    check (notes is null or char_length(notes) <= 200),
  add constraint umpire_availability_length_valid
    check (ends_at <= starts_at + interval '90 days');

create index if not exists umpire_availability_umpire_idx
  on public.umpire_availability (umpire_id, starts_at);

create index if not exists umpire_availability_ends_idx
  on public.umpire_availability (ends_at);

commit;
