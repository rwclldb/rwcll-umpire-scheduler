-- Email outbox (a stub for sending email later).
--
-- Real email sending is not set up yet. Instead of sending, anything that
-- wants to email someone adds a message to this outbox. Today an administrator
-- reviews the queue, copies a message, sends it by hand, and marks it sent.
-- Later a sender (for example a scheduled server function using Google
-- Workspace or another provider) can pick up the queued messages and send
-- them automatically, with no change to the screens that create them.
--
--   email_outbox          the queue. Readable by scheduling admins only (the
--                         messages contain personal details). Written only
--                         through the functions below.
--   queue_email()         add a message. Scheduling admins only.
--   mark_email_sent()     record that a message was sent by hand.
--   skip_email()          set a message aside without sending it.
--   enqueue_email()       INTERNAL: the same as queue_email but with no
--                         caller check, for other database functions and
--                         triggers (for example "a game assignment changed").
--                         It cannot be called from the app.

begin;

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'other'
    check (kind in ('invitation', 'assignment', 'schedule_change',
                    'reminder', 'broadcast', 'other')),
  to_email text not null,
  to_profile_id uuid references public.profiles(id) on delete set null,
  subject text not null,
  body text not null,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'failed', 'skipped')),
  sent_via text check (sent_via is null or sent_via in ('manual', 'smtp')),
  attempts integer not null default 0,
  last_error text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,

  constraint email_outbox_to_valid
    check (
      to_email = lower(btrim(to_email))
      and char_length(to_email) <= 254
      and to_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ),
  constraint email_outbox_subject_valid
    check (char_length(btrim(subject)) between 1 and 200),
  constraint email_outbox_body_valid
    check (char_length(btrim(body)) between 1 and 10000),
  constraint email_outbox_sent_consistent
    check ((status = 'sent') = (sent_at is not null))
);

create index email_outbox_queue_idx
  on public.email_outbox (status, created_at);

alter table public.email_outbox enable row level security;

create policy "Scheduling admins read the email outbox"
on public.email_outbox
for select to authenticated
using (public.is_scheduling_admin());

revoke all on table public.email_outbox from public, anon, authenticated;
grant select on table public.email_outbox to authenticated;

-- INTERNAL: add a message with no caller check. Not callable from the app.
create or replace function public.enqueue_email(
  p_kind text,
  p_to_email text,
  p_subject text,
  p_body text,
  p_to_profile_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.email_outbox
    (kind, to_email, to_profile_id, subject, body, created_by)
  values (
    p_kind,
    lower(btrim(coalesce(p_to_email, ''))),
    p_to_profile_id,
    btrim(coalesce(p_subject, '')),
    btrim(coalesce(p_body, '')),
    (select auth.uid())
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.enqueue_email(text, text, text, text, uuid)
from public, anon, authenticated;

-- Add a message to the outbox (scheduling admins).
create or replace function public.queue_email(
  p_kind text,
  p_to_email text,
  p_subject text,
  p_body text,
  p_to_profile_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_scheduling_admin() then
    raise exception 'Only scheduling administrators can queue email.';
  end if;

  return public.enqueue_email(
    p_kind, p_to_email, p_subject, p_body, p_to_profile_id
  );
end;
$$;

-- Record that a queued (or failed) message was sent by hand.
create or replace function public.mark_email_sent(p_id uuid)
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
    raise exception 'Only scheduling administrators can update the outbox.';
  end if;

  update public.email_outbox
  set status = 'sent', sent_via = 'manual', sent_at = now(),
      attempts = attempts + 1, last_error = null
  where id = p_id and status in ('queued', 'failed');

  if not found then
    raise exception 'That message was not found or is no longer waiting.';
  end if;
end;
$$;

-- Set a message aside without sending it.
create or replace function public.skip_email(p_id uuid)
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
    raise exception 'Only scheduling administrators can update the outbox.';
  end if;

  update public.email_outbox
  set status = 'skipped'
  where id = p_id and status in ('queued', 'failed');

  if not found then
    raise exception 'That message was not found or is no longer waiting.';
  end if;
end;
$$;

revoke all on function public.queue_email(text, text, text, text, uuid) from public, anon;
revoke all on function public.mark_email_sent(uuid) from public, anon;
revoke all on function public.skip_email(uuid) from public, anon;

grant execute on function public.queue_email(text, text, text, text, uuid) to authenticated;
grant execute on function public.mark_email_sent(uuid) to authenticated;
grant execute on function public.skip_email(uuid) to authenticated;

commit;
