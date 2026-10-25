-- Contact email for umpire records.
--
-- Emails live on accounts (profiles.email), but an umpire record can exist
-- before the person has an account. This adds an optional email to the
-- administrator-only private details so those umpires can have one too.
--
-- It is stored in umpire_private_details, NOT in umpires, because umpires
-- is readable by every approved account and a youth umpire's email must
-- not be. Access follows the existing private-details policies.
--
-- Emails are kept lower-case with no surrounding spaces. This does not need
-- to be unique: it is a contact address, not a sign-in name.

begin;

alter table public.umpire_private_details
  add column if not exists email text;

alter table public.umpire_private_details
  add constraint umpire_private_details_email_valid
  check (
    email is null
    or (email = lower(btrim(email)) and char_length(email) <= 254)
  );

commit;
