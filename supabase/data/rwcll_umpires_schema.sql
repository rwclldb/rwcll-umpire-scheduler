


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."admin_confirm_assignment"("p_game_id" "uuid", "p_umpire_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_row public.game_assignments%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_scheduling_admin() then
    raise exception 'Only scheduling administrators can confirm an assignment for an umpire.';
  end if;

  select * into v_row
  from public.game_assignments
  where game_id = p_game_id and umpire_id = p_umpire_id;

  if not found then
    raise exception 'That umpire is not assigned to that game.';
  end if;

  if v_row.status = 'confirmed' then
    return;
  end if;

  update public.game_assignments
  set status = 'confirmed', confirmed_at = now()
  where id = v_row.id;

  insert into public.game_assignment_events (game_id, umpire_id, position, event, actor_id, note)
  values (p_game_id, p_umpire_id, v_row.position, 'confirmed', (select auth.uid()), 'confirmed by an administrator');
end;
$$;


ALTER FUNCTION "public"."admin_confirm_assignment"("p_game_id" "uuid", "p_umpire_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_umpire_registration"("p_profile_id" "uuid", "p_classification" "text", "p_birth_date" "date") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_umpire uuid;
  v_age integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_approved_user()
     or not (public.has_role('super_admin') or public.has_role('umpire_chief')) then
    raise exception 'Only a super admin or umpire chief can approve umpire registrations.';
  end if;

  if p_classification not in ('youth', 'adult') then
    raise exception 'Choose youth or adult.';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = p_profile_id
      and p.account_status = 'pending'
      and p.registration_kind in ('youth_umpire', 'adult_umpire')
  ) then
    raise exception 'That registration was not found, or it was already reviewed.';
  end if;

  select u.id into v_umpire
  from public.umpires u
  where u.profile_id = p_profile_id;

  if v_umpire is null then
    raise exception 'That person has not finished registering yet.';
  end if;

  if p_birth_date is null then
    if p_classification = 'youth' then
      raise exception 'Enter a birth date to approve a youth umpire.';
    end if;
  else
    if p_birth_date > current_date then
      raise exception 'The birth date cannot be in the future.';
    end if;

    v_age := extract(year from age(current_date, p_birth_date))::integer;

    if v_age < 13 then
      raise exception 'Umpires under 13 cannot be approved this way. They need a parent account and consent first.';
    end if;
    if p_classification = 'adult' and v_age < 18 then
      raise exception 'This person is under 18, so they cannot be approved as an adult umpire.';
    end if;
    if p_classification = 'youth' and v_age >= 18 then
      raise exception 'This person is 18 or older, so approve them as an adult umpire.';
    end if;
  end if;

  update public.profiles
  set account_status = 'approved',
      approved_by = (select auth.uid()),
      approved_at = now()
  where id = p_profile_id;

  update public.umpires
  set classification = p_classification,
      eligibility_status = 'active'
  where id = v_umpire;

  if p_birth_date is not null then
    insert into public.umpire_private_details (umpire_id, birth_date)
    values (v_umpire, p_birth_date)
    on conflict (umpire_id) do update set birth_date = excluded.birth_date;
  end if;

  insert into public.user_roles (user_id, role_id, granted_by)
  values (
    p_profile_id,
    case when p_classification = 'youth' then 'youth_umpire' else 'adult_umpire' end,
    (select auth.uid())
  )
  on conflict do nothing;
end;
$$;


ALTER FUNCTION "public"."approve_umpire_registration"("p_profile_id" "uuid", "p_classification" "text", "p_birth_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_availability_pattern"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_ends date;
begin
  select s.ends_on into v_ends
  from public.seasons s
  where s.id = new.season_id;

  if v_ends is null then
    raise exception 'A repeating time needs a season that has an end date.'
      using errcode = 'check_violation';
  end if;

  if new.starts_on > v_ends then
    raise exception 'A repeating time cannot start after the end of its season (%).', v_ends
      using errcode = 'check_violation';
  end if;

  new.weekdays := array(
    select distinct d from unnest(new.weekdays) as d order by d
  );

  return new;
end;
$$;


ALTER FUNCTION "public"."check_availability_pattern"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_registration"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_confirmed timestamptz;
  v_profile public.profiles%rowtype;
  v_inv public.umpire_invitations%rowtype;
  v_class text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select u.email, u.email_confirmed_at
  into v_email, v_confirmed
  from auth.users u
  where u.id = v_uid;

  if v_email is null or v_confirmed is null then
    return 'unconfirmed';
  end if;

  select * into v_profile from public.profiles p where p.id = v_uid;
  if not found then
    return 'none';
  end if;

  if exists (select 1 from public.umpires u where u.profile_id = v_uid) then
    return 'already';
  end if;

  if v_profile.account_status in ('rejected', 'suspended') then
    return 'blocked';
  end if;

  -- 1. An invitation for this (confirmed) email address.
  select i.* into v_inv
  from public.umpire_invitations i
  join public.umpires u on u.id = i.umpire_id
  where i.status = 'pending'
    and i.expires_at > now()
    and i.email = lower(v_email)
    and u.profile_id is null
  order by i.created_at desc
  limit 1;

  if found then
    update public.umpires set profile_id = v_uid where id = v_inv.umpire_id;

    if v_profile.account_status = 'pending' then
      update public.profiles
      set account_status = 'approved',
          approved_by = v_inv.invited_by,
          approved_at = now()
      where id = v_uid;
    end if;

    select u.classification into v_class
    from public.umpires u where u.id = v_inv.umpire_id;

    insert into public.user_roles (user_id, role_id, granted_by)
    values (
      v_uid,
      case when v_class = 'youth' then 'youth_umpire' else 'adult_umpire' end,
      v_inv.invited_by
    )
    on conflict do nothing;

    update public.umpire_invitations
    set status = 'accepted', accepted_at = now(), accepted_by = v_uid
    where id = v_inv.id;

    return 'invited';
  end if;

  -- 2. A self-registration: create a pending record for review.
  if v_profile.registration_kind in ('youth_umpire', 'adult_umpire')
     and v_profile.account_status = 'pending' then
    insert into public.umpires
      (profile_id, display_name, classification, eligibility_status)
    values (
      v_uid,
      coalesce(nullif(btrim(v_profile.display_name), ''), 'New umpire'),
      case when v_profile.registration_kind = 'youth_umpire' then 'youth' else 'adult' end,
      'inactive'
    );
    return 'registered';
  end if;

  return 'none';
end;
$$;


ALTER FUNCTION "public"."claim_registration"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."confirm_assignment"("p_game_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_umpire uuid;
  v_row public.game_assignments%rowtype;
  v_game_status text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  v_umpire := public.my_umpire_id();
  if v_umpire is null then
    raise exception 'You need an approved account linked to an umpire record to confirm an assignment.';
  end if;

  select * into v_row
  from public.game_assignments
  where game_id = p_game_id and umpire_id = v_umpire;

  if not found then
    raise exception 'You are not assigned to that game.';
  end if;

  select status into v_game_status from public.games where id = p_game_id;
  if v_game_status = 'canceled' then
    raise exception 'That game has been canceled.';
  end if;

  if v_row.status = 'confirmed' then
    return;
  end if;

  update public.game_assignments
  set status = 'confirmed', confirmed_at = now()
  where id = v_row.id;

  insert into public.game_assignment_events (game_id, umpire_id, position, event, actor_id)
  values (p_game_id, v_umpire, v_row.position, 'confirmed', (select auth.uid()));
end;
$$;


ALTER FUNCTION "public"."confirm_assignment"("p_game_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decline_assignment"("p_game_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_umpire uuid;
  v_name text;
  v_row public.game_assignments%rowtype;
  v_game public.games%rowtype;
  v_reason text := left(btrim(coalesce(p_reason, '')), 500);
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  v_umpire := public.my_umpire_id();
  if v_umpire is null then
    raise exception 'You need an approved account linked to an umpire record to decline an assignment.';
  end if;

  select * into v_row
  from public.game_assignments
  where game_id = p_game_id and umpire_id = v_umpire;

  if not found then
    raise exception 'You are not assigned to that game.';
  end if;

  select * into v_game from public.games where id = p_game_id;

  if v_game.status = 'canceled' then
    raise exception 'That game has been canceled.';
  end if;

  if v_game.starts_at <= now() then
    raise exception 'That game has already started. Please contact an administrator.';
  end if;

  delete from public.game_assignments where id = v_row.id;

  insert into public.game_assignment_events (game_id, umpire_id, position, event, actor_id, note)
  values (p_game_id, v_umpire, v_row.position, 'declined', (select auth.uid()), nullif(v_reason, ''));

  select display_name into v_name from public.umpires where id = v_umpire;

  perform public.notice_admins(
    'schedule_change',
    'Umpire declined: ' || coalesce(v_name, 'An umpire'),
    coalesce(v_name, 'An umpire') || ' has declined the ' || public.position_phrase(v_row.position)
      || ' place for ' || public.game_summary_text(p_game_id) || E'.\n\n'
      || case when v_reason <> '' then 'Reason given: ' || v_reason || E'\n\n' else '' end
      || 'The place is open again and needs someone else.'
  );
end;
$$;


ALTER FUNCTION "public"."decline_assignment"("p_game_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_account_contact_rules"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if new.sms_opt_in then
    if tg_op = 'INSERT' or old.sms_opt_in is distinct from true then
      if (select auth.uid()) is distinct from new.profile_id then
        raise exception 'Only the account holder can choose to receive text messages.';
      end if;
      new.sms_opt_in_at := now();
    else
      new.sms_opt_in_at := old.sms_opt_in_at;
    end if;
  else
    new.sms_opt_in_at := null;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."enforce_account_contact_rules"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_role_assignment_rules"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if tg_op = 'INSERT' then
    if not exists (
      select 1
      from public.profiles p
      where p.id = new.user_id
        and p.account_status = 'approved'
    ) then
      raise exception 'Roles can only be given to approved accounts.';
    end if;

    if new.role_id = 'youth_umpire' and exists (
      select 1 from public.user_roles r
      where r.user_id = new.user_id and r.role_id = 'adult_umpire'
    ) then
      raise exception 'This account is already an adult umpire. Remove that role first.';
    end if;

    if new.role_id = 'adult_umpire' and exists (
      select 1 from public.user_roles r
      where r.user_id = new.user_id and r.role_id = 'youth_umpire'
    ) then
      raise exception 'This account is already a youth umpire. Remove that role first.';
    end if;

    return new;
  end if;

  -- DELETE
  if old.role_id = 'super_admin' and not exists (
    select 1 from public.user_roles r
    where r.role_id = 'super_admin'
      and r.user_id <> old.user_id
  ) then
    raise exception 'The last super admin cannot be removed. Make someone else a super admin first.';
  end if;

  return old;
end;
$$;


ALTER FUNCTION "public"."enforce_role_assignment_rules"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enqueue_email"("p_kind" "text", "p_to_email" "text", "p_subject" "text", "p_body" "text", "p_to_profile_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."enqueue_email"("p_kind" "text", "p_to_email" "text", "p_subject" "text", "p_body" "text", "p_to_profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."game_open_places"("p_game_id" "uuid") RETURNS "text"[]
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_needed integer;
  v_layout text[];
  v_taken text[];
  v_open_left integer;
  v_result text[] := '{}';
  v_place text;
begin
  select coalesce(
    g.umpires_needed,
    case when g.game_type = 'tournament' and d.tournament_umpires is not null
         then d.tournament_umpires
         else d.umpires_per_game end
  )
  into v_needed
  from public.games g
  join public.divisions d on d.id = g.division_id
  where g.id = p_game_id;

  if v_needed is null then
    return '{}';
  end if;

  v_layout := case v_needed
    when 0 then array[]::text[]
    when 1 then array['plate']
    when 2 then array['plate', 'field']
    when 3 then array['plate', 'first_base', 'third_base']
    else array['plate', 'first_base', 'second_base', 'third_base']
  end;

  select coalesce(array_agg(ga.position), array[]::text[])
  into v_taken
  from public.game_assignments ga
  where ga.game_id = p_game_id;

  v_open_left := greatest(0, v_needed - coalesce(array_length(v_taken, 1), 0));

  foreach v_place in array v_layout
  loop
    exit when v_open_left <= 0;

    if not (v_place = any (v_taken)) then
      v_result := v_result || v_place;
      v_open_left := v_open_left - 1;
    end if;
  end loop;

  return v_result;
end;
$$;


ALTER FUNCTION "public"."game_open_places"("p_game_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."game_summary_text"("p_game_id" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    coalesce(ht.name, g.home_label, 'TBD') || ' vs ' || coalesce(aw.name, g.away_label, 'TBD')
    || ' on ' || to_char(g.starts_at at time zone 'America/Los_Angeles', 'FMDay, FMMonth FMDD')
    || ' at ' || to_char(g.starts_at at time zone 'America/Los_Angeles', 'FMHH12:MI AM')
    || ' (' || coalesce(l.name, 'field to be announced') || ', ' || d.name || ')'
  from public.games g
  join public.divisions d on d.id = g.division_id
  left join public.teams ht on ht.id = g.home_team_id
  left join public.teams aw on aw.id = g.away_team_id
  left join public.locations l on l.id = g.location_id
  where g.id = p_game_id;
$$;


ALTER FUNCTION "public"."game_summary_text"("p_game_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."game_umpire_eligibility"("p_game_id" "uuid") RETURNS TABLE("umpire_id" "uuid", "problem" "text", "note" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not public.is_scheduling_admin() then
    raise exception 'Only scheduling administrators can check umpire eligibility.';
  end if;

  return query
  select u.id, c.problem, c.note
  from public.umpires u
  cross join lateral public.umpire_game_check(u.id, p_game_id) c
  where u.classification = 'youth';
end;
$$;


ALTER FUNCTION "public"."game_umpire_eligibility"("p_game_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_kind text := new.raw_user_meta_data ->> 'signup_kind';
begin
  insert into public.profiles (id, display_name, email, registration_kind)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    coalesce(new.email, ''),
    case when v_kind in ('youth_umpire', 'adult_umpire') then v_kind else null end
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("required_role" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
    select exists (
        select 1
        from public.user_roles ur
        where ur.user_id = (select auth.uid())
          and ur.role_id = required_role
    );
$$;


ALTER FUNCTION "public"."has_role"("required_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."import_age_chart"("p_chart_year" integer, "p_name" "text", "p_entries" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_chart_id uuid;
  v_name text := btrim(coalesce(p_name, ''));
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_scheduling_admin() then
    raise exception 'Only scheduling administrators can import age charts';
  end if;

  if p_chart_year is null or p_chart_year not between 2000 and 2100 then
    raise exception 'Chart year must be between 2000 and 2100';
  end if;

  if v_name = '' or char_length(v_name) > 100 then
    raise exception 'Chart name is required and must be 100 characters or fewer';
  end if;

  if p_entries is null
     or jsonb_typeof(p_entries) <> 'array'
     or jsonb_array_length(p_entries) = 0 then
    raise exception 'Chart entries must be a non-empty list';
  end if;

  if jsonb_array_length(p_entries) > 1000 then
    raise exception 'Chart has too many entries';
  end if;

  insert into public.little_league_age_charts (chart_year, name, created_by)
  values (p_chart_year, v_name, (select auth.uid()))
  returning id into v_chart_id;

  insert into public.little_league_age_chart_entries
    (chart_id, birth_month, birth_year, ll_age)
  select v_chart_id, x.birth_month, x.birth_year, x.ll_age
  from jsonb_to_recordset(p_entries)
    as x(birth_month smallint, birth_year smallint, ll_age smallint);

  return v_chart_id;
end;
$$;


ALTER FUNCTION "public"."import_age_chart"("p_chart_year" integer, "p_name" "text", "p_entries" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."import_games"("p_season_id" "uuid", "p_new_teams" "jsonb", "p_new_locations" "jsonb", "p_games" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."import_games"("p_season_id" "uuid", "p_new_teams" "jsonb", "p_new_locations" "jsonb", "p_games" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."import_season"("p_league_id" "uuid", "p_season" "jsonb", "p_divisions" "jsonb", "p_teams" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."import_season"("p_league_id" "uuid", "p_season" "jsonb", "p_divisions" "jsonb", "p_teams" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."invite_umpire"("p_umpire_id" "uuid", "p_email" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_scheduling_admin() then
    raise exception 'Only scheduling administrators can invite umpires.';
  end if;

  if char_length(v_email) > 254
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid email address.';
  end if;

  if not exists (select 1 from public.umpires u where u.id = p_umpire_id) then
    raise exception 'That umpire record was not found.';
  end if;

  if exists (
    select 1 from public.umpires u
    where u.id = p_umpire_id and u.profile_id is not null
  ) then
    raise exception 'This umpire is already linked to an account.';
  end if;

  if exists (select 1 from public.profiles p where lower(p.email) = v_email) then
    raise exception 'An account already uses this email. Use "Link account" instead.';
  end if;

  -- A new invitation replaces any open one for this umpire or this email.
  update public.umpire_invitations
  set status = 'revoked'
  where status = 'pending'
    and (umpire_id = p_umpire_id or email = v_email);

  insert into public.umpire_invitations (umpire_id, email, invited_by)
  values (p_umpire_id, v_email, (select auth.uid()))
  returning id into v_id;

  insert into public.umpire_private_details (umpire_id, email)
  values (p_umpire_id, v_email)
  on conflict (umpire_id) do update set email = excluded.email;

  return v_id;
end;
$_$;


ALTER FUNCTION "public"."invite_umpire"("p_umpire_id" "uuid", "p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_approved_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
    select public.is_approved_user()
       and (
           public.has_role('super_admin')
           or public.has_role('umpire_chief')
           or public.has_role('scheduler')
           or public.has_role('treasurer')
           or public.has_role('feedback_reviewer')
           or public.has_role('read_only_admin')
       );
$$;


ALTER FUNCTION "public"."is_approved_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_approved_user"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
    select exists (
        select 1
        from public.profiles p
        where p.id = (select auth.uid())
          and p.account_status = 'approved'
    );
$$;


ALTER FUNCTION "public"."is_approved_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_scheduling_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
    select public.is_approved_user()
       and (
           public.has_role('super_admin')
           or public.has_role('umpire_chief')
           or public.has_role('scheduler')
       );
$$;


ALTER FUNCTION "public"."is_scheduling_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."keep_alive"() RETURNS timestamp with time zone
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select now();
$$;


ALTER FUNCTION "public"."keep_alive"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ll_age_for_season"("p_season_id" "uuid", "p_birth_year" integer, "p_birth_month" integer) RETURNS smallint
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select e.ll_age
  from public.seasons s
  join public.little_league_age_chart_entries e
    on e.chart_id = s.age_chart_id
  where s.id = p_season_id
    and e.birth_year = p_birth_year
    and e.birth_month = p_birth_month;
$$;


ALTER FUNCTION "public"."ll_age_for_season"("p_season_id" "uuid", "p_birth_year" integer, "p_birth_month" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_email_sent"("p_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."mark_email_sent"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."my_umpire_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select u.id
  from public.umpires u
  join public.profiles p on p.id = u.profile_id
  where u.profile_id = (select auth.uid())
    and p.account_status = 'approved';
$$;


ALTER FUNCTION "public"."my_umpire_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notice_admins"("p_kind" "text", "p_subject" "text", "p_body" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  r record;
begin
  for r in
    select distinct p.id as profile_id, p.email as email
    from public.profiles p
    join public.user_roles ur on ur.user_id = p.id
    where p.account_status = 'approved'
      and ur.role_id in ('super_admin', 'umpire_chief', 'scheduler')
      and btrim(p.email) <> ''
  loop
    perform public.queue_notice(p_kind, r.email, r.profile_id, p_subject, p_body);
  end loop;
end;
$$;


ALTER FUNCTION "public"."notice_admins"("p_kind" "text", "p_subject" "text", "p_body" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notice_umpire"("p_umpire_id" "uuid", "p_kind" "text", "p_subject" "text", "p_body" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  perform public.queue_notice(
    p_kind,
    public.umpire_notice_email(p_umpire_id),
    (select u.profile_id from public.umpires u where u.id = p_umpire_id),
    p_subject,
    p_body
  );
end;
$$;


ALTER FUNCTION "public"."notice_umpire"("p_umpire_id" "uuid", "p_kind" "text", "p_subject" "text", "p_body" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."position_phrase"("p" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  select case p
    when 'plate' then 'plate'
    when 'first_base' then 'first base'
    when 'second_base' then 'second base'
    when 'third_base' then 'third base'
    when 'field' then 'field'
    else p
  end;
$$;


ALTER FUNCTION "public"."position_phrase"("p" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."queue_email"("p_kind" "text", "p_to_email" "text", "p_subject" "text", "p_body" "text", "p_to_profile_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."queue_email"("p_kind" "text", "p_to_email" "text", "p_subject" "text", "p_body" "text", "p_to_profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."queue_notice"("p_kind" "text", "p_to_email" "text", "p_to_profile" "uuid", "p_subject" "text", "p_body" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
begin
  if p_to_email is null
     or char_length(p_to_email) > 254
     or p_to_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    return;
  end if;

  begin
    perform public.enqueue_email(p_kind, p_to_email, left(p_subject, 200), left(p_body, 10000), p_to_profile);
  exception when others then
    null;
  end;
end;
$_$;


ALTER FUNCTION "public"."queue_notice"("p_kind" "text", "p_to_email" "text", "p_to_profile" "uuid", "p_subject" "text", "p_body" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."queue_self_assign_digest"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_total integer := 0;
  r record;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_scheduling_admin() then
    raise exception 'Only scheduling administrators can queue this summary.';
  end if;

  for r in
    with claimed as (
      update public.game_assignments ga
      set self_assign_notified_at = now()
      where ga.self_assigned
        and ga.self_assign_notified_at is null
        and (ga.assigned_at at time zone 'America/Los_Angeles')::date
            < (now() at time zone 'America/Los_Angeles')::date
      returning ga.game_id, ga.umpire_id, ga.position, ga.assigned_at
    )
    select
      (c.assigned_at at time zone 'America/Los_Angeles')::date as day,
      count(*)::integer as n,
      string_agg(
        '- ' || u.display_name || ' (' || public.position_phrase(c.position) || '): '
          || public.game_summary_text(c.game_id),
        E'\n' order by gm.starts_at, u.display_name
      ) as lines
    from claimed c
    join public.games gm on gm.id = c.game_id
    join public.umpires u on u.id = c.umpire_id
    group by 1
    order by 1
  loop
    v_total := v_total + r.n;

    perform public.notice_admins(
      'assignment',
      'Umpires took ' || r.n || ' game' || case when r.n = 1 then '' else 's' end
        || ' on ' || to_char(r.day, 'FMDay, FMMonth FMDD'),
      'These games were taken by umpires for themselves on '
        || to_char(r.day, 'FMDay, FMMonth FMDD') || E':\n\n' || r.lines
    );
  end loop;

  return v_total;
end;
$$;


ALTER FUNCTION "public"."queue_self_assign_digest"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."queue_unconfirmed_warnings"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_count integer;
  v_lines text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_scheduling_admin() then
    raise exception 'Only scheduling administrators can queue these warnings.';
  end if;

  with claimed as (
    update public.game_assignments ga
    set unconfirmed_warned_at = now()
    from public.games g
    join public.divisions d on d.id = g.division_id
    join public.leagues lg on lg.id = d.league_id
    where ga.game_id = g.id
      and ga.status = 'assigned'
      and ga.unconfirmed_warned_at is null
      and g.status not in ('canceled', 'completed')
      and lg.unconfirmed_warning_days > 0
      and g.starts_at > now()
      and g.starts_at <= now() + make_interval(days => lg.unconfirmed_warning_days)
    returning ga.game_id, ga.umpire_id, ga.position
  )
  select
    count(*),
    string_agg(
      '- ' || u.display_name || ' (' || public.position_phrase(c.position) || '): '
        || public.game_summary_text(c.game_id),
      E'\n' order by gm.starts_at, u.display_name
    )
  into v_count, v_lines
  from claimed c
  join public.games gm on gm.id = c.game_id
  join public.umpires u on u.id = c.umpire_id;

  if coalesce(v_count, 0) = 0 then
    return 0;
  end if;

  perform public.notice_admins(
    'reminder',
    v_count || ' umpire assignment' || case when v_count = 1 then '' else 's' end || ' still not confirmed',
    'These umpire assignments have not been confirmed, and the games are coming up:' || E'\n\n'
      || v_lines || E'\n\n'
      || 'An umpire confirms or declines when they sign in. You can also mark an assignment as confirmed yourself.'
  );

  return v_count;
end;
$$;


ALTER FUNCTION "public"."queue_unconfirmed_warnings"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_umpire_registration"("p_profile_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_approved_user()
     or not (public.has_role('super_admin') or public.has_role('umpire_chief')) then
    raise exception 'Only a super admin or umpire chief can reject umpire registrations.';
  end if;

  update public.profiles
  set account_status = 'rejected',
      approved_by = (select auth.uid()),
      approved_at = null
  where id = p_profile_id
    and account_status = 'pending'
    and registration_kind in ('youth_umpire', 'adult_umpire');

  if not found then
    raise exception 'That registration was not found, or it was already reviewed.';
  end if;
end;
$$;


ALTER FUNCTION "public"."reject_umpire_registration"("p_profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."renew_umpire_invitation"("p_invitation_id" "uuid") RETURNS timestamp with time zone
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_expires timestamptz;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_scheduling_admin() then
    raise exception 'Only scheduling administrators can renew invitations.';
  end if;

  update public.umpire_invitations
  set expires_at = now() + interval '30 days'
  where id = p_invitation_id and status = 'pending'
  returning expires_at into v_expires;

  if v_expires is null then
    raise exception 'That invitation was not found or is no longer open.';
  end if;

  return v_expires;
end;
$$;


ALTER FUNCTION "public"."renew_umpire_invitation"("p_invitation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revoke_umpire_invitation"("p_invitation_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_scheduling_admin() then
    raise exception 'Only scheduling administrators can revoke invitations.';
  end if;

  update public.umpire_invitations
  set status = 'revoked'
  where id = p_invitation_id and status = 'pending';

  if not found then
    raise exception 'That invitation was not found or is no longer open.';
  end if;
end;
$$;


ALTER FUNCTION "public"."revoke_umpire_invitation"("p_invitation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
  tbl name;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        SELECT c.relname INTO tbl FROM pg_catalog.pg_class c WHERE c.oid = cmd.objid;
        EXECUTE format('alter table if exists %I.%I enable row level security', cmd.schema_name, tbl);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."self_assign"("p_game_id" "uuid", "p_place" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_umpire uuid;
  v_game public.games%rowtype;
  v_division public.divisions%rowtype;
  v_max smallint;
  v_upcoming integer;
  v_problem text;
  v_name text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  v_umpire := public.my_umpire_id();
  if v_umpire is null then
    raise exception 'You need an approved account linked to an umpire record to take a game.';
  end if;

  if not exists (
    select 1 from public.umpires u
    where u.id = v_umpire and u.eligibility_status = 'active'
  ) then
    raise exception 'Only active umpires can take games.';
  end if;

  if not exists (
    select 1 from public.umpires u
    where u.id = v_umpire and u.can_self_assign
  ) then
    raise exception 'An administrator has turned off taking games for yourself for you. Please contact them.';
  end if;

  -- One person at a time per game, so two umpires cannot take the same place.
  select * into v_game from public.games where id = p_game_id for update;
  if not found then
    raise exception 'That game was not found.';
  end if;

  if v_game.status not in ('draft', 'scheduled') then
    raise exception 'That game is not open for assigning.';
  end if;

  if v_game.starts_at <= now() then
    raise exception 'That game has already started.';
  end if;

  select * into v_division from public.divisions where id = v_game.division_id;
  if not v_division.allow_self_assign then
    raise exception 'Umpires cannot assign themselves to games in this division.';
  end if;

  if exists (
    select 1 from public.game_assignments ga
    where ga.game_id = p_game_id and ga.umpire_id = v_umpire
  ) then
    raise exception 'You are already assigned to that game.';
  end if;

  if p_place is null or not (p_place = any (public.game_open_places(p_game_id))) then
    raise exception 'That place is not open (it may have just been taken).';
  end if;

  if exists (
    select 1
    from public.game_assignments me
    join public.games og on og.id = me.game_id
    where me.umpire_id = v_umpire
      and og.id <> v_game.id
      and og.status <> 'canceled'
      and og.starts_at < v_game.ends_at
      and og.ends_at > v_game.starts_at
  ) then
    raise exception 'You already have a game at that time.';
  end if;

  select lg.self_assign_max_games into v_max
  from public.leagues lg
  where lg.id = v_division.league_id;

  if v_max is not null then
    select count(*) into v_upcoming
    from public.game_assignments me
    join public.games og on og.id = me.game_id
    where me.umpire_id = v_umpire
      and og.status <> 'canceled'
      and og.ends_at > now();

    if v_upcoming >= v_max then
      raise exception 'You already have the most games you can take for yourself (%). Decline one first, or ask an administrator.', v_max;
    end if;
  end if;

  select c.problem into v_problem
  from public.umpire_game_check_internal(v_umpire, p_game_id) c;

  if v_problem is not null then
    raise exception '%', v_problem;
  end if;

  insert into public.game_assignments
    (game_id, umpire_id, position, status, self_assigned, confirmed_at, assigned_by)
  values
    (p_game_id, v_umpire, p_place, 'confirmed', true, now(), (select auth.uid()));

  insert into public.game_assignment_events (game_id, umpire_id, position, event, actor_id, note)
  values (p_game_id, v_umpire, p_place, 'assigned', (select auth.uid()), 'assigned themselves');

  -- Tell the administrators. When the game is close (within 48 hours) they are
  -- told straight away; otherwise it goes in the daily summary
  -- (queue_self_assign_digest), so it is marked as not yet told about.
  if v_game.starts_at <= now() + interval '48 hours' then
    select display_name into v_name from public.umpires where id = v_umpire;

    update public.game_assignments
    set self_assign_notified_at = now()
    where game_id = p_game_id and umpire_id = v_umpire;

    perform public.notice_admins(
      'assignment',
      'Umpire took a game within 48 hours: ' || coalesce(v_name, 'An umpire'),
      coalesce(v_name, 'An umpire') || ' has taken the ' || public.position_phrase(p_place)
        || ' place for ' || public.game_summary_text(p_game_id) || E'.\n\n'
        || 'The game is within 48 hours, so you are told straight away. '
        || 'Games further ahead are in a daily summary.'
    );
  end if;
end;
$$;


ALTER FUNCTION "public"."self_assign"("p_game_id" "uuid", "p_place" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."self_assign_options"("p_from" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_to" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE("game_id" "uuid", "place" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_umpire uuid;
  v_upcoming integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  v_umpire := public.my_umpire_id();
  if v_umpire is null then
    return;
  end if;

  if not exists (
    select 1 from public.umpires u
    where u.id = v_umpire and u.eligibility_status = 'active' and u.can_self_assign
  ) then
    return;
  end if;

  -- Games still to come that this umpire already has (played and canceled ones do not count).
  select count(*) into v_upcoming
  from public.game_assignments me
  join public.games og on og.id = me.game_id
  where me.umpire_id = v_umpire
    and og.status <> 'canceled'
    and og.ends_at > now();

  return query
  select g.id, o.place
  from public.games g
  join public.divisions d on d.id = g.division_id
  join public.leagues lg on lg.id = d.league_id
  cross join lateral unnest(public.game_open_places(g.id)) as o(place)
  where d.allow_self_assign
    and g.status in ('draft', 'scheduled')
    and g.starts_at > now()
    and (p_from is null or g.starts_at >= p_from)
    and (p_to is null or g.starts_at < p_to)
    and (lg.self_assign_max_games is null or v_upcoming < lg.self_assign_max_games)
    and not exists (
      select 1 from public.game_assignments me
      where me.game_id = g.id and me.umpire_id = v_umpire
    )
    and not exists (
      select 1
      from public.game_assignments me
      join public.games og on og.id = me.game_id
      where me.umpire_id = v_umpire
        and og.id <> g.id
        and og.status <> 'canceled'
        and og.starts_at < g.ends_at
        and og.ends_at > g.starts_at
    )
    and not exists (
      select 1
      from public.umpire_game_check_internal(v_umpire, g.id) c
      where c.problem is not null
    )
  order by g.starts_at, g.id, o.place
  limit 500;
end;
$$;


ALTER FUNCTION "public"."self_assign_options"("p_from" timestamp with time zone, "p_to" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_account_status"("target_user_id" "uuid", "new_status" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
    if (select auth.uid()) is null then
        raise exception 'Authentication required';
    end if;

    if not public.is_approved_user()
       or not public.has_role('super_admin') then
        raise exception 'Only an approved Super Admin can change account status';
    end if;

    if target_user_id = (select auth.uid()) then
        raise exception 'You cannot change your own account status';
    end if;

    if new_status not in ('approved', 'rejected', 'suspended') then
        raise exception 'Invalid account status';
    end if;

    update public.profiles
    set
        account_status = new_status,
        approved_by = (select auth.uid()),
        approved_at = case
            when new_status = 'approved' then now()
            else null
        end
    where id = target_user_id;

    if not found then
        raise exception 'Target user profile was not found';
    end if;
end;
$$;


ALTER FUNCTION "public"."set_account_status"("target_user_id" "uuid", "new_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_game_umpires"("p_game_id" "uuid", "p_umpires" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_pos text;
  v_val jsonb;
  v_key text;
  v_wanted jsonb := '{}'::jsonb;
  v_ids text[];
  v_old jsonb;
  v_game_status text;
  v_summary text;
  r record;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_scheduling_admin() then
    raise exception 'Only scheduling administrators can assign umpires.';
  end if;

  select status into v_game_status from public.games where id = p_game_id;
  if not found then
    raise exception 'That game was not found.';
  end if;

  if p_umpires is null or jsonb_typeof(p_umpires) <> 'object' then
    raise exception 'The umpires must be given as positions and umpire ids.';
  end if;

  for v_pos, v_val in select key, value from jsonb_each(p_umpires)
  loop
    if v_pos not in ('plate', 'first_base', 'second_base', 'third_base', 'field') then
      raise exception 'Unknown position: %', v_pos;
    end if;

    if jsonb_typeof(v_val) = 'null' then
      continue;
    end if;

    if jsonb_typeof(v_val) <> 'string' then
      raise exception 'The umpire for % must be an id or empty.', v_pos;
    end if;

    v_wanted := v_wanted || jsonb_build_object(v_pos, v_val);
  end loop;

  select array_agg(value #>> '{}') into v_ids from jsonb_each(v_wanted);

  if (select count(*) from unnest(v_ids))
     <> (select count(distinct x) from unnest(v_ids) as x) then
    raise exception 'The same umpire cannot hold two places in one game.';
  end if;

  -- How each umpire stands now (to keep confirmations, and to tell who is new).
  select coalesce(
    jsonb_object_agg(
      ga.umpire_id::text,
      jsonb_build_object('status', ga.status, 'self', ga.self_assigned, 'at', ga.confirmed_at)
    ),
    '{}'::jsonb
  )
  into v_old
  from public.game_assignments ga
  where ga.game_id = p_game_id;

  v_summary := public.game_summary_text(p_game_id);

  -- Umpires who are leaving the game altogether.
  for r in
    select ga.umpire_id, ga.position
    from public.game_assignments ga
    where ga.game_id = p_game_id
      and not (ga.umpire_id::text = any (coalesce(v_ids, '{}'::text[])))
  loop
    insert into public.game_assignment_events (game_id, umpire_id, position, event, actor_id)
    values (p_game_id, r.umpire_id, r.position, 'removed', (select auth.uid()));

    if v_game_status <> 'canceled' then
      perform public.notice_umpire(
        r.umpire_id,
        'schedule_change',
        'You are no longer assigned to a game',
        'You have been taken off the ' || public.position_phrase(r.position) || ' place for ' || v_summary || '.'
      );
    end if;
  end loop;

  -- First remove the places that are being cleared or given to someone else
  -- (this is also what lets two umpires swap), then fill the places that are
  -- now empty. An umpire who stays where they are is not touched at all (not
  -- even re-checked, so an umpire who has since become inactive can stay on
  -- a game while another place is changed).
  delete from public.game_assignments ga
  where ga.game_id = p_game_id
    and ga.umpire_id::text is distinct from (v_wanted ->> ga.position);

  for v_pos, v_val in select key, value from jsonb_each(v_wanted)
  loop
    if not exists (
      select 1 from public.game_assignments ga
      where ga.game_id = p_game_id and ga.position = v_pos
    ) then
      v_key := v_val #>> '{}';

      insert into public.game_assignments
        (game_id, umpire_id, position, status, self_assigned, confirmed_at)
      values (
        p_game_id,
        v_key::uuid,
        v_pos,
        coalesce(v_old -> v_key ->> 'status', 'assigned'),
        coalesce((v_old -> v_key ->> 'self')::boolean, false),
        (v_old -> v_key ->> 'at')::timestamptz
      );

      -- Someone new on the game: record it and let them know.
      if not (v_old ? v_key) then
        insert into public.game_assignment_events (game_id, umpire_id, position, event, actor_id)
        values (p_game_id, v_key::uuid, v_pos, 'assigned', (select auth.uid()));

        perform public.notice_umpire(
          v_key::uuid,
          'assignment',
          'You have been assigned to a game',
          'You have been assigned as the ' || public.position_phrase(v_pos) || ' umpire for '
            || v_summary || E'.\n\nPlease sign in to confirm or decline this assignment.'
        );
      end if;
    end if;
  end loop;
end;
$$;


ALTER FUNCTION "public"."set_game_umpires"("p_game_id" "uuid", "p_umpires" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
    new.updated_at = now();
    return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."skip_email"("p_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."skip_email"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."umpire_game_check"("p_umpire_id" "uuid", "p_game_id" "uuid") RETURNS TABLE("problem" "text", "note" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not public.is_scheduling_admin() then
    return;
  end if;

  return query
  select c.problem, c.note
  from public.umpire_game_check_internal(p_umpire_id, p_game_id) c;
end;
$$;


ALTER FUNCTION "public"."umpire_game_check"("p_umpire_id" "uuid", "p_game_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."umpire_game_check_internal"("p_umpire_id" "uuid", "p_game_id" "uuid") RETURNS TABLE("problem" "text", "note" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_class text;
  v_plays uuid;
  v_birth date;
  v_season uuid;
  v_game_division uuid;
  v_division text;
  v_youngest smallint;
  v_oldest smallint;
  v_ll_age smallint;
begin
  select u.classification, u.plays_in_division_id
  into v_class, v_plays
  from public.umpires u
  where u.id = p_umpire_id;

  if v_class is distinct from 'youth' then
    return;
  end if;

  select g.season_id, g.division_id, d.name, d.youngest_ll_age, d.oldest_ll_age
  into v_season, v_game_division, v_division, v_youngest, v_oldest
  from public.games g
  join public.divisions d on d.id = g.division_id
  where g.id = p_game_id;

  -- The division recorded as the one they play in is never theirs to umpire.
  -- (This needs no birth date and no age range.)
  if v_plays is not null and v_plays = v_game_division then
    problem := format('A youth umpire cannot umpire the division they play in (%s).', v_division);
    note := null;
    return next;
    return;
  end if;

  if v_youngest is null then
    return;
  end if;

  select pd.birth_date into v_birth
  from public.umpire_private_details pd
  where pd.umpire_id = p_umpire_id;

  if v_birth is null then
    problem := null;
    note := 'No birth date is on file, so the youth age rule could not be checked.';
    return next;
    return;
  end if;

  v_ll_age := public.ll_age_for_season(
    v_season,
    extract(year from v_birth)::integer,
    extract(month from v_birth)::integer
  );

  if v_ll_age is null then
    problem := null;
    note := 'The season''s age chart does not cover this birth month, so the youth age rule could not be checked.';
    return next;
    return;
  end if;

  -- A division whose players start at their age or older.
  if v_youngest >= v_ll_age then
    problem := format(
      'A youth umpire with Little League age %s cannot umpire %s (its players start at age %s).',
      v_ll_age, v_division, v_youngest
    );
    note := null;
    return next;
    return;
  end if;

  -- No division recorded: they are taken to play in any division whose ages include theirs.
  if v_plays is null and v_oldest is not null and v_ll_age <= v_oldest then
    problem := format(
      'A youth umpire with Little League age %s cannot umpire %s, a division whose ages (%s to %s) include theirs.',
      v_ll_age, v_division, v_youngest, v_oldest
    );
    note := null;
    return next;
  end if;
end;
$$;


ALTER FUNCTION "public"."umpire_game_check_internal"("p_umpire_id" "uuid", "p_game_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."umpire_notice_email"("p_umpire_id" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select nullif(btrim(coalesce(nullif(btrim(p.email), ''), pd.email, '')), '')
  from public.umpires u
  left join public.profiles p on p.id = u.profile_id
  left join public.umpire_private_details pd on pd.umpire_id = u.id
  where u.id = p_umpire_id;
$$;


ALTER FUNCTION "public"."umpire_notice_email"("p_umpire_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_game_assignment"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_status text;
  v_eligibility text;
  v_problem text;
begin
  if not public.is_scheduling_admin() then
    return new;
  end if;

  -- Only check when a game or umpire is being put in: editing the notes of an
  -- old assignment must keep working.
  if tg_op = 'UPDATE'
     and new.game_id = old.game_id
     and new.umpire_id = old.umpire_id then
    return new;
  end if;

  select status into v_status from public.games where id = new.game_id;
  if v_status = 'canceled' then
    raise exception 'Umpires cannot be assigned to a canceled game.';
  end if;

  select eligibility_status into v_eligibility
  from public.umpires where id = new.umpire_id;
  if v_eligibility is not null and v_eligibility <> 'active' then
    raise exception 'That umpire is not active, so cannot be assigned to a game.';
  end if;

  select c.problem into v_problem
  from public.umpire_game_check(new.umpire_id, new.game_id) c;
  if v_problem is not null then
    raise exception '%', v_problem;
  end if;

  if tg_op = 'INSERT' and new.assigned_by is null then
    new.assigned_by := (select auth.uid());
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_game_assignment"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."account_admin_details" (
    "profile_id" "uuid" NOT NULL,
    "external_id_primary" "text",
    "external_id_secondary" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "account_admin_details_external_ids_valid" CHECK (((("external_id_primary" IS NULL) OR (("external_id_primary" = "btrim"("external_id_primary")) AND (("char_length"("external_id_primary") >= 1) AND ("char_length"("external_id_primary") <= 100)))) AND (("external_id_secondary" IS NULL) OR (("external_id_secondary" = "btrim"("external_id_secondary")) AND (("char_length"("external_id_secondary") >= 1) AND ("char_length"("external_id_secondary") <= 100))))))
);


ALTER TABLE "public"."account_admin_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."account_contact" (
    "profile_id" "uuid" NOT NULL,
    "phone" "text",
    "sms_opt_in" boolean DEFAULT false NOT NULL,
    "sms_opt_in_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "account_contact_phone_valid" CHECK ((("phone" IS NULL) OR ("phone" ~ '^[0-9+() .-]{7,30}$'::"text"))),
    CONSTRAINT "account_contact_sms_needs_phone" CHECK (((NOT "sms_opt_in") OR ("phone" IS NOT NULL)))
);


ALTER TABLE "public"."account_contact" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."divisions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "league_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "age_group" "text",
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "youngest_ll_age" smallint,
    "oldest_ll_age" smallint,
    "umpires_per_game" smallint DEFAULT 2 NOT NULL,
    "tournament_umpires" smallint,
    "allow_self_assign" boolean DEFAULT false NOT NULL,
    CONSTRAINT "divisions_ll_age_range_valid" CHECK (((("youngest_ll_age" IS NULL) AND ("oldest_ll_age" IS NULL)) OR (("youngest_ll_age" IS NOT NULL) AND ("oldest_ll_age" IS NOT NULL) AND (("youngest_ll_age" >= 4) AND ("youngest_ll_age" <= 18)) AND (("oldest_ll_age" >= 4) AND ("oldest_ll_age" <= 18)) AND ("youngest_ll_age" <= "oldest_ll_age")))),
    CONSTRAINT "divisions_tournament_umpires_valid" CHECK ((("tournament_umpires" IS NULL) OR (("tournament_umpires" >= 0) AND ("tournament_umpires" <= 4)))),
    CONSTRAINT "divisions_umpires_per_game_valid" CHECK ((("umpires_per_game" >= 0) AND ("umpires_per_game" <= 4)))
);


ALTER TABLE "public"."divisions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_outbox" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "kind" "text" DEFAULT 'other'::"text" NOT NULL,
    "to_email" "text" NOT NULL,
    "to_profile_id" "uuid",
    "subject" "text" NOT NULL,
    "body" "text" NOT NULL,
    "status" "text" DEFAULT 'queued'::"text" NOT NULL,
    "sent_via" "text",
    "attempts" integer DEFAULT 0 NOT NULL,
    "last_error" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sent_at" timestamp with time zone,
    CONSTRAINT "email_outbox_body_valid" CHECK ((("char_length"("btrim"("body")) >= 1) AND ("char_length"("btrim"("body")) <= 10000))),
    CONSTRAINT "email_outbox_kind_check" CHECK (("kind" = ANY (ARRAY['invitation'::"text", 'assignment'::"text", 'schedule_change'::"text", 'reminder'::"text", 'broadcast'::"text", 'other'::"text"]))),
    CONSTRAINT "email_outbox_sent_consistent" CHECK ((("status" = 'sent'::"text") = ("sent_at" IS NOT NULL))),
    CONSTRAINT "email_outbox_sent_via_check" CHECK ((("sent_via" IS NULL) OR ("sent_via" = ANY (ARRAY['manual'::"text", 'smtp'::"text"])))),
    CONSTRAINT "email_outbox_status_check" CHECK (("status" = ANY (ARRAY['queued'::"text", 'sent'::"text", 'failed'::"text", 'skipped'::"text"]))),
    CONSTRAINT "email_outbox_subject_valid" CHECK ((("char_length"("btrim"("subject")) >= 1) AND ("char_length"("btrim"("subject")) <= 200))),
    CONSTRAINT "email_outbox_to_valid" CHECK ((("to_email" = "lower"("btrim"("to_email"))) AND ("char_length"("to_email") <= 254) AND ("to_email" ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'::"text")))
);


ALTER TABLE "public"."email_outbox" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."game_assignment_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "game_id" "uuid" NOT NULL,
    "umpire_id" "uuid" NOT NULL,
    "position" "text" NOT NULL,
    "event" "text" NOT NULL,
    "actor_id" "uuid",
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "game_assignment_events_event_valid" CHECK (("event" = ANY (ARRAY['assigned'::"text", 'confirmed'::"text", 'declined'::"text", 'removed'::"text"])))
);


ALTER TABLE "public"."game_assignment_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."game_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "game_id" "uuid" NOT NULL,
    "umpire_id" "uuid" NOT NULL,
    "position" "text" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "assigned_by" "uuid",
    "notes" "text",
    "status" "text" DEFAULT 'assigned'::"text" NOT NULL,
    "self_assigned" boolean DEFAULT false NOT NULL,
    "confirmed_at" timestamp with time zone,
    "unconfirmed_warned_at" timestamp with time zone,
    "self_assign_notified_at" timestamp with time zone,
    CONSTRAINT "game_assignments_confirmed_time_valid" CHECK ((("status" = 'confirmed'::"text") = ("confirmed_at" IS NOT NULL))),
    CONSTRAINT "game_assignments_position_valid" CHECK (("position" = ANY (ARRAY['plate'::"text", 'first_base'::"text", 'second_base'::"text", 'third_base'::"text", 'field'::"text"]))),
    CONSTRAINT "game_assignments_status_valid" CHECK (("status" = ANY (ARRAY['assigned'::"text", 'confirmed'::"text"])))
);


ALTER TABLE "public"."game_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."games" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "season_id" "uuid" NOT NULL,
    "home_team_id" "uuid",
    "away_team_id" "uuid",
    "location_id" "uuid" NOT NULL,
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "division_id" "uuid" NOT NULL,
    "game_type" "text" DEFAULT 'regular'::"text" NOT NULL,
    "home_label" "text",
    "away_label" "text",
    "external_game_id" "text",
    "umpires_needed" smallint,
    CONSTRAINT "games_away_side_valid" CHECK ((("away_team_id" IS NULL) <> ("away_label" IS NULL))),
    CONSTRAINT "games_different_teams" CHECK (("home_team_id" <> "away_team_id")),
    CONSTRAINT "games_external_id_valid" CHECK ((("external_game_id" IS NULL) OR (("external_game_id" = "btrim"("external_game_id")) AND (("char_length"("external_game_id") >= 1) AND ("char_length"("external_game_id") <= 100))))),
    CONSTRAINT "games_home_side_valid" CHECK ((("home_team_id" IS NULL) <> ("home_label" IS NULL))),
    CONSTRAINT "games_labels_valid" CHECK (((("home_label" IS NULL) OR (("char_length"("btrim"("home_label")) >= 1) AND ("char_length"("btrim"("home_label")) <= 100))) AND (("away_label" IS NULL) OR (("char_length"("btrim"("away_label")) >= 1) AND ("char_length"("btrim"("away_label")) <= 100))))),
    CONSTRAINT "games_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'scheduled'::"text", 'canceled'::"text", 'completed'::"text"]))),
    CONSTRAINT "games_type_valid" CHECK (("game_type" = ANY (ARRAY['regular'::"text", 'tournament'::"text", 'scrimmage'::"text"]))),
    CONSTRAINT "games_umpires_needed_valid" CHECK ((("umpires_needed" IS NULL) OR (("umpires_needed" >= 0) AND ("umpires_needed" <= 4)))),
    CONSTRAINT "games_valid_time" CHECK (("ends_at" > "starts_at"))
);


ALTER TABLE "public"."games" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leagues" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "unconfirmed_warning_days" smallint DEFAULT 7 NOT NULL,
    "self_assign_max_games" smallint,
    CONSTRAINT "leagues_self_assign_max_games_valid" CHECK ((("self_assign_max_games" IS NULL) OR (("self_assign_max_games" >= 1) AND ("self_assign_max_games" <= 500)))),
    CONSTRAINT "leagues_unconfirmed_warning_days_valid" CHECK ((("unconfirmed_warning_days" >= 0) AND ("unconfirmed_warning_days" <= 60)))
);


ALTER TABLE "public"."leagues" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."little_league_age_chart_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chart_id" "uuid" NOT NULL,
    "birth_month" smallint NOT NULL,
    "birth_year" smallint NOT NULL,
    "ll_age" smallint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "age_chart_entries_age_valid" CHECK ((("ll_age" >= 4) AND ("ll_age" <= 18))),
    CONSTRAINT "age_chart_entries_month_valid" CHECK ((("birth_month" >= 1) AND ("birth_month" <= 12))),
    CONSTRAINT "age_chart_entries_year_valid" CHECK ((("birth_year" >= 1900) AND ("birth_year" <= 2100)))
);


ALTER TABLE "public"."little_league_age_chart_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."little_league_age_charts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chart_year" integer NOT NULL,
    "name" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "little_league_age_charts_name_valid" CHECK ((("btrim"("name") <> ''::"text") AND ("char_length"("name") <= 100))),
    CONSTRAINT "little_league_age_charts_year_valid" CHECK ((("chart_year" >= 2000) AND ("chart_year" <= 2100)))
);


ALTER TABLE "public"."little_league_age_charts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "address" "text",
    "notes" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "display_name" "text" DEFAULT ''::"text" NOT NULL,
    "email" "text" DEFAULT ''::"text" NOT NULL,
    "account_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "registration_kind" "text",
    CONSTRAINT "profiles_account_status_check" CHECK (("account_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'suspended'::"text"]))),
    CONSTRAINT "profiles_registration_kind_valid" CHECK ((("registration_kind" IS NULL) OR ("registration_kind" = ANY (ARRAY['youth_umpire'::"text", 'adult_umpire'::"text", 'parent_guardian'::"text"]))))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "text" NOT NULL,
    "description" "text" NOT NULL
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."seasons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "starts_on" "date",
    "ends_on" "date",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "age_chart_id" "uuid",
    CONSTRAINT "seasons_check" CHECK ((("ends_on" IS NULL) OR ("starts_on" IS NULL) OR ("ends_on" >= "starts_on")))
);


ALTER TABLE "public"."seasons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "league_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "division_id" "uuid"
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."umpire_availability" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "umpire_id" "uuid" NOT NULL,
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "kind" "text" DEFAULT 'available'::"text" NOT NULL,
    CONSTRAINT "umpire_availability_kind_valid" CHECK (("kind" = ANY (ARRAY['available'::"text", 'unavailable'::"text"]))),
    CONSTRAINT "umpire_availability_length_valid" CHECK (("ends_at" <= ("starts_at" + '90 days'::interval))),
    CONSTRAINT "umpire_availability_notes_valid" CHECK ((("notes" IS NULL) OR ("char_length"("notes") <= 200))),
    CONSTRAINT "umpire_availability_valid_time" CHECK (("ends_at" > "starts_at"))
);


ALTER TABLE "public"."umpire_availability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."umpire_availability_patterns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "umpire_id" "uuid" NOT NULL,
    "season_id" "uuid" NOT NULL,
    "weekdays" smallint[] NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "starts_on" "date" DEFAULT CURRENT_DATE NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "umpire_availability_patterns_notes_valid" CHECK ((("notes" IS NULL) OR ("char_length"("notes") <= 200))),
    CONSTRAINT "umpire_availability_patterns_times_valid" CHECK (("end_time" > "start_time")),
    CONSTRAINT "umpire_availability_patterns_weekdays_valid" CHECK (((("cardinality"("weekdays") >= 1) AND ("cardinality"("weekdays") <= 7)) AND ("weekdays" <@ ARRAY[(0)::smallint, (1)::smallint, (2)::smallint, (3)::smallint, (4)::smallint, (5)::smallint, (6)::smallint])))
);


ALTER TABLE "public"."umpire_availability_patterns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."umpire_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "umpire_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "invited_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '30 days'::interval) NOT NULL,
    "accepted_at" timestamp with time zone,
    "accepted_by" "uuid",
    CONSTRAINT "umpire_invitations_email_valid" CHECK ((("email" = "lower"("btrim"("email"))) AND ("char_length"("email") <= 254) AND ("email" ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'::"text"))),
    CONSTRAINT "umpire_invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'revoked'::"text"])))
);


ALTER TABLE "public"."umpire_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."umpire_private_details" (
    "umpire_id" "uuid" NOT NULL,
    "emergency_contact_name" "text",
    "emergency_contact_phone" "text",
    "admin_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email" "text",
    "birth_date" "date",
    "external_id_primary" "text",
    "external_id_secondary" "text",
    CONSTRAINT "umpire_private_details_birth_date_valid" CHECK ((("birth_date" IS NULL) OR (("birth_date" >= '1900-01-01'::"date") AND ("birth_date" <= '2100-12-31'::"date")))),
    CONSTRAINT "umpire_private_details_email_valid" CHECK ((("email" IS NULL) OR (("email" = "lower"("btrim"("email"))) AND ("char_length"("email") <= 254)))),
    CONSTRAINT "umpire_private_details_external_ids_valid" CHECK (((("external_id_primary" IS NULL) OR (("external_id_primary" = "btrim"("external_id_primary")) AND (("char_length"("external_id_primary") >= 1) AND ("char_length"("external_id_primary") <= 100)))) AND (("external_id_secondary" IS NULL) OR (("external_id_secondary" = "btrim"("external_id_secondary")) AND (("char_length"("external_id_secondary") >= 1) AND ("char_length"("external_id_secondary") <= 100))))))
);


ALTER TABLE "public"."umpire_private_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."umpires" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid",
    "umpire_number" "text",
    "display_name" "text" NOT NULL,
    "classification" "text" NOT NULL,
    "phone" "text",
    "eligibility_status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "can_self_assign" boolean DEFAULT true NOT NULL,
    "plays_in_division_id" "uuid",
    CONSTRAINT "umpires_classification_check" CHECK (("classification" = ANY (ARRAY['youth'::"text", 'adult'::"text"]))),
    CONSTRAINT "umpires_eligibility_status_check" CHECK (("eligibility_status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'suspended'::"text"])))
);


ALTER TABLE "public"."umpires" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "user_id" "uuid" NOT NULL,
    "role_id" "text" NOT NULL,
    "granted_by" "uuid",
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."account_admin_details"
    ADD CONSTRAINT "account_admin_details_pkey" PRIMARY KEY ("profile_id");



ALTER TABLE ONLY "public"."account_contact"
    ADD CONSTRAINT "account_contact_pkey" PRIMARY KEY ("profile_id");



ALTER TABLE ONLY "public"."little_league_age_chart_entries"
    ADD CONSTRAINT "age_chart_entries_month_age_unique" UNIQUE ("chart_id", "birth_month", "ll_age");



ALTER TABLE ONLY "public"."little_league_age_chart_entries"
    ADD CONSTRAINT "age_chart_entries_month_year_unique" UNIQUE ("chart_id", "birth_month", "birth_year");



ALTER TABLE ONLY "public"."divisions"
    ADD CONSTRAINT "divisions_id_league_unique" UNIQUE ("id", "league_id");



ALTER TABLE ONLY "public"."divisions"
    ADD CONSTRAINT "divisions_name_per_league" UNIQUE ("league_id", "name");



ALTER TABLE ONLY "public"."divisions"
    ADD CONSTRAINT "divisions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_outbox"
    ADD CONSTRAINT "email_outbox_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."game_assignment_events"
    ADD CONSTRAINT "game_assignment_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."game_assignments"
    ADD CONSTRAINT "game_assignments_one_per_position" UNIQUE ("game_id", "position");



ALTER TABLE ONLY "public"."game_assignments"
    ADD CONSTRAINT "game_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."game_assignments"
    ADD CONSTRAINT "game_assignments_umpire_once_per_game" UNIQUE ("game_id", "umpire_id");



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leagues"
    ADD CONSTRAINT "leagues_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."leagues"
    ADD CONSTRAINT "leagues_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."little_league_age_chart_entries"
    ADD CONSTRAINT "little_league_age_chart_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."little_league_age_charts"
    ADD CONSTRAINT "little_league_age_charts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."little_league_age_charts"
    ADD CONSTRAINT "little_league_age_charts_year_name_unique" UNIQUE ("chart_year", "name");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_id_division_unique" UNIQUE ("id", "division_id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_id_season_unique" UNIQUE ("id", "season_id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_league_id_season_id_name_key" UNIQUE ("league_id", "season_id", "name");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."umpire_availability_patterns"
    ADD CONSTRAINT "umpire_availability_patterns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."umpire_availability"
    ADD CONSTRAINT "umpire_availability_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."umpire_invitations"
    ADD CONSTRAINT "umpire_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."umpire_private_details"
    ADD CONSTRAINT "umpire_private_details_pkey" PRIMARY KEY ("umpire_id");



ALTER TABLE ONLY "public"."umpires"
    ADD CONSTRAINT "umpires_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."umpires"
    ADD CONSTRAINT "umpires_profile_id_key" UNIQUE ("profile_id");



ALTER TABLE ONLY "public"."umpires"
    ADD CONSTRAINT "umpires_umpire_number_key" UNIQUE ("umpire_number");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id", "role_id");



CREATE UNIQUE INDEX "account_admin_details_external_id_primary_unique" ON "public"."account_admin_details" USING "btree" ("external_id_primary") WHERE ("external_id_primary" IS NOT NULL);



CREATE UNIQUE INDEX "account_admin_details_external_id_secondary_unique" ON "public"."account_admin_details" USING "btree" ("external_id_secondary") WHERE ("external_id_secondary" IS NOT NULL);



CREATE INDEX "email_outbox_queue_idx" ON "public"."email_outbox" USING "btree" ("status", "created_at");



CREATE INDEX "game_assignment_events_game_idx" ON "public"."game_assignment_events" USING "btree" ("game_id", "created_at");



CREATE INDEX "game_assignments_umpire_idx" ON "public"."game_assignments" USING "btree" ("umpire_id");



CREATE INDEX "games_division_idx" ON "public"."games" USING "btree" ("division_id");



CREATE INDEX "games_location_time_idx" ON "public"."games" USING "btree" ("location_id", "starts_at");



CREATE UNIQUE INDEX "games_season_external_id_unique" ON "public"."games" USING "btree" ("season_id", "external_game_id") WHERE ("external_game_id" IS NOT NULL);



CREATE INDEX "games_season_idx" ON "public"."games" USING "btree" ("season_id");



CREATE INDEX "games_starts_at_idx" ON "public"."games" USING "btree" ("starts_at");



CREATE UNIQUE INDEX "profiles_email_unique" ON "public"."profiles" USING "btree" ("lower"("email")) WHERE ("email" <> ''::"text");



CREATE INDEX "seasons_age_chart_idx" ON "public"."seasons" USING "btree" ("age_chart_id");



CREATE INDEX "teams_division_idx" ON "public"."teams" USING "btree" ("division_id");



CREATE INDEX "umpire_availability_ends_idx" ON "public"."umpire_availability" USING "btree" ("ends_at");



CREATE INDEX "umpire_availability_patterns_season_idx" ON "public"."umpire_availability_patterns" USING "btree" ("season_id");



CREATE INDEX "umpire_availability_patterns_umpire_idx" ON "public"."umpire_availability_patterns" USING "btree" ("umpire_id");



CREATE INDEX "umpire_availability_umpire_idx" ON "public"."umpire_availability" USING "btree" ("umpire_id", "starts_at");



CREATE INDEX "umpire_availability_umpire_time_idx" ON "public"."umpire_availability" USING "btree" ("umpire_id", "starts_at", "ends_at");



CREATE UNIQUE INDEX "umpire_invitations_one_pending_per_email" ON "public"."umpire_invitations" USING "btree" ("email") WHERE ("status" = 'pending'::"text");



CREATE UNIQUE INDEX "umpire_invitations_one_pending_per_umpire" ON "public"."umpire_invitations" USING "btree" ("umpire_id") WHERE ("status" = 'pending'::"text");



CREATE UNIQUE INDEX "umpire_private_details_external_id_primary_unique" ON "public"."umpire_private_details" USING "btree" ("external_id_primary") WHERE ("external_id_primary" IS NOT NULL);



CREATE UNIQUE INDEX "umpire_private_details_external_id_secondary_unique" ON "public"."umpire_private_details" USING "btree" ("external_id_secondary") WHERE ("external_id_secondary" IS NOT NULL);



CREATE OR REPLACE TRIGGER "account_admin_details_set_updated_at" BEFORE UPDATE ON "public"."account_admin_details" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "account_contact_enforce_rules" BEFORE INSERT OR UPDATE ON "public"."account_contact" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_account_contact_rules"();



CREATE OR REPLACE TRIGGER "account_contact_set_updated_at" BEFORE UPDATE ON "public"."account_contact" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "game_assignments_validate" BEFORE INSERT OR UPDATE ON "public"."game_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."validate_game_assignment"();



CREATE OR REPLACE TRIGGER "games_set_updated_at" BEFORE UPDATE ON "public"."games" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "profiles_set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "umpire_availability_patterns_check" BEFORE INSERT OR UPDATE ON "public"."umpire_availability_patterns" FOR EACH ROW EXECUTE FUNCTION "public"."check_availability_pattern"();



CREATE OR REPLACE TRIGGER "umpire_availability_patterns_set_updated_at" BEFORE UPDATE ON "public"."umpire_availability_patterns" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "umpire_availability_set_updated_at" BEFORE UPDATE ON "public"."umpire_availability" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "umpire_private_details_set_updated_at" BEFORE UPDATE ON "public"."umpire_private_details" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "umpires_set_updated_at" BEFORE UPDATE ON "public"."umpires" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "user_roles_enforce_delete_rules" BEFORE DELETE ON "public"."user_roles" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_role_assignment_rules"();



CREATE OR REPLACE TRIGGER "user_roles_enforce_insert_rules" BEFORE INSERT ON "public"."user_roles" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_role_assignment_rules"();



ALTER TABLE ONLY "public"."account_admin_details"
    ADD CONSTRAINT "account_admin_details_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."account_contact"
    ADD CONSTRAINT "account_contact_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."divisions"
    ADD CONSTRAINT "divisions_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."email_outbox"
    ADD CONSTRAINT "email_outbox_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."email_outbox"
    ADD CONSTRAINT "email_outbox_to_profile_id_fkey" FOREIGN KEY ("to_profile_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."game_assignment_events"
    ADD CONSTRAINT "game_assignment_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."game_assignment_events"
    ADD CONSTRAINT "game_assignment_events_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."game_assignment_events"
    ADD CONSTRAINT "game_assignment_events_umpire_id_fkey" FOREIGN KEY ("umpire_id") REFERENCES "public"."umpires"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."game_assignments"
    ADD CONSTRAINT "game_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."game_assignments"
    ADD CONSTRAINT "game_assignments_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."game_assignments"
    ADD CONSTRAINT "game_assignments_umpire_id_fkey" FOREIGN KEY ("umpire_id") REFERENCES "public"."umpires"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_away_team_in_division" FOREIGN KEY ("away_team_id", "division_id") REFERENCES "public"."teams"("id", "division_id");



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_away_team_in_season" FOREIGN KEY ("away_team_id", "season_id") REFERENCES "public"."teams"("id", "season_id");



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_home_team_in_division" FOREIGN KEY ("home_team_id", "division_id") REFERENCES "public"."teams"("id", "division_id");



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_home_team_in_season" FOREIGN KEY ("home_team_id", "season_id") REFERENCES "public"."teams"("id", "season_id");



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."games"
    ADD CONSTRAINT "games_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."little_league_age_chart_entries"
    ADD CONSTRAINT "little_league_age_chart_entries_chart_id_fkey" FOREIGN KEY ("chart_id") REFERENCES "public"."little_league_age_charts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."little_league_age_charts"
    ADD CONSTRAINT "little_league_age_charts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_age_chart_id_fkey" FOREIGN KEY ("age_chart_id") REFERENCES "public"."little_league_age_charts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_division_in_same_league" FOREIGN KEY ("division_id", "league_id") REFERENCES "public"."divisions"("id", "league_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id");



ALTER TABLE ONLY "public"."umpire_availability_patterns"
    ADD CONSTRAINT "umpire_availability_patterns_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."umpire_availability_patterns"
    ADD CONSTRAINT "umpire_availability_patterns_umpire_id_fkey" FOREIGN KEY ("umpire_id") REFERENCES "public"."umpires"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."umpire_availability"
    ADD CONSTRAINT "umpire_availability_umpire_id_fkey" FOREIGN KEY ("umpire_id") REFERENCES "public"."umpires"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."umpire_invitations"
    ADD CONSTRAINT "umpire_invitations_accepted_by_fkey" FOREIGN KEY ("accepted_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."umpire_invitations"
    ADD CONSTRAINT "umpire_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."umpire_invitations"
    ADD CONSTRAINT "umpire_invitations_umpire_id_fkey" FOREIGN KEY ("umpire_id") REFERENCES "public"."umpires"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."umpire_private_details"
    ADD CONSTRAINT "umpire_private_details_umpire_id_fkey" FOREIGN KEY ("umpire_id") REFERENCES "public"."umpires"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."umpires"
    ADD CONSTRAINT "umpires_plays_in_division_id_fkey" FOREIGN KEY ("plays_in_division_id") REFERENCES "public"."divisions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."umpires"
    ADD CONSTRAINT "umpires_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Account holder and scheduling admins add contact details" ON "public"."account_contact" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_scheduling_admin"() OR ("public"."is_approved_user"() AND ("profile_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Account holder and scheduling admins read contact details" ON "public"."account_contact" FOR SELECT TO "authenticated" USING (("public"."is_scheduling_admin"() OR ("public"."is_approved_user"() AND ("profile_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Account holder and scheduling admins update contact details" ON "public"."account_contact" FOR UPDATE TO "authenticated" USING (("public"."is_scheduling_admin"() OR ("public"."is_approved_user"() AND ("profile_id" = ( SELECT "auth"."uid"() AS "uid"))))) WITH CHECK (("public"."is_scheduling_admin"() OR ("public"."is_approved_user"() AND ("profile_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Approved admins can create assignments" ON "public"."game_assignments" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_scheduling_admin"());



CREATE POLICY "Approved admins can create divisions" ON "public"."divisions" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_scheduling_admin"());



CREATE POLICY "Approved admins can create games" ON "public"."games" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_scheduling_admin"());



CREATE POLICY "Approved admins can delete assignments" ON "public"."game_assignments" FOR DELETE TO "authenticated" USING ("public"."is_scheduling_admin"());



CREATE POLICY "Approved admins can delete divisions" ON "public"."divisions" FOR DELETE TO "authenticated" USING ("public"."is_scheduling_admin"());



CREATE POLICY "Approved admins can delete games" ON "public"."games" FOR DELETE TO "authenticated" USING ("public"."is_scheduling_admin"());



CREATE POLICY "Approved admins can insert umpire private details" ON "public"."umpire_private_details" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_scheduling_admin"());



CREATE POLICY "Approved admins can update assignments" ON "public"."game_assignments" FOR UPDATE TO "authenticated" USING ("public"."is_scheduling_admin"()) WITH CHECK ("public"."is_scheduling_admin"());



CREATE POLICY "Approved admins can update divisions" ON "public"."divisions" FOR UPDATE TO "authenticated" USING ("public"."is_scheduling_admin"()) WITH CHECK ("public"."is_scheduling_admin"());



CREATE POLICY "Approved admins can update games" ON "public"."games" FOR UPDATE TO "authenticated" USING ("public"."is_scheduling_admin"()) WITH CHECK ("public"."is_scheduling_admin"());



CREATE POLICY "Approved admins can update umpire private details" ON "public"."umpire_private_details" FOR UPDATE TO "authenticated" USING ("public"."is_scheduling_admin"()) WITH CHECK ("public"."is_scheduling_admin"());



CREATE POLICY "Approved admins can view umpire private details" ON "public"."umpire_private_details" FOR SELECT TO "authenticated" USING ("public"."is_scheduling_admin"());



CREATE POLICY "Approved users can view divisions" ON "public"."divisions" FOR SELECT TO "authenticated" USING ("public"."is_approved_user"());



CREATE POLICY "Approved users can view games" ON "public"."games" FOR SELECT TO "authenticated" USING ("public"."is_approved_user"());



CREATE POLICY "Approved users read age chart entries" ON "public"."little_league_age_chart_entries" FOR SELECT TO "authenticated" USING ("public"."is_approved_user"());



CREATE POLICY "Approved users read age charts" ON "public"."little_league_age_charts" FOR SELECT TO "authenticated" USING ("public"."is_approved_user"());



CREATE POLICY "Approved users read leagues" ON "public"."leagues" FOR SELECT TO "authenticated" USING ("public"."is_approved_user"());



CREATE POLICY "Approved users read locations" ON "public"."locations" FOR SELECT TO "authenticated" USING ("public"."is_approved_user"());



CREATE POLICY "Approved users read role definitions" ON "public"."roles" FOR SELECT TO "authenticated" USING ("public"."is_approved_user"());



CREATE POLICY "Approved users read seasons" ON "public"."seasons" FOR SELECT TO "authenticated" USING ("public"."is_approved_user"());



CREATE POLICY "Approved users read teams" ON "public"."teams" FOR SELECT TO "authenticated" USING ("public"."is_approved_user"());



CREATE POLICY "Authorized admins add umpires" ON "public"."umpires" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_approved_user"() AND ("public"."has_role"('super_admin'::"text") OR "public"."has_role"('umpire_chief'::"text") OR "public"."has_role"('scheduler'::"text"))));



CREATE POLICY "Authorized admins delete umpires" ON "public"."umpires" FOR DELETE TO "authenticated" USING (("public"."is_approved_user"() AND ("public"."has_role"('super_admin'::"text") OR "public"."has_role"('umpire_chief'::"text"))));



CREATE POLICY "Authorized admins update umpires" ON "public"."umpires" FOR UPDATE TO "authenticated" USING (("public"."is_approved_user"() AND ("public"."has_role"('super_admin'::"text") OR "public"."has_role"('umpire_chief'::"text") OR "public"."has_role"('scheduler'::"text")))) WITH CHECK (("public"."is_approved_user"() AND ("public"."has_role"('super_admin'::"text") OR "public"."has_role"('umpire_chief'::"text") OR "public"."has_role"('scheduler'::"text"))));



CREATE POLICY "Read own profile or admin profile access" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_scheduling_admin"()));



CREATE POLICY "Read own roles or super admin reads all" ON "public"."user_roles" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("public"."is_approved_user"() AND "public"."has_role"('super_admin'::"text"))));



CREATE POLICY "Scheduling admins add account admin details" ON "public"."account_admin_details" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_scheduling_admin"());



CREATE POLICY "Scheduling admins and assigned umpires view assignments" ON "public"."game_assignments" FOR SELECT TO "authenticated" USING (("public"."is_scheduling_admin"() OR ("public"."is_approved_user"() AND (EXISTS ( SELECT 1
   FROM "public"."umpires" "u"
  WHERE (("u"."id" = "game_assignments"."umpire_id") AND ("u"."profile_id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "Scheduling admins and the umpire read umpire records" ON "public"."umpires" FOR SELECT TO "authenticated" USING (("public"."is_scheduling_admin"() OR ("public"."is_approved_user"() AND ("profile_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Scheduling admins can read assignment events" ON "public"."game_assignment_events" FOR SELECT TO "authenticated" USING ("public"."is_scheduling_admin"());



CREATE POLICY "Scheduling admins manage leagues" ON "public"."leagues" TO "authenticated" USING (("public"."is_approved_user"() AND ("public"."has_role"('super_admin'::"text") OR "public"."has_role"('umpire_chief'::"text") OR "public"."has_role"('scheduler'::"text")))) WITH CHECK (("public"."is_approved_user"() AND ("public"."has_role"('super_admin'::"text") OR "public"."has_role"('umpire_chief'::"text") OR "public"."has_role"('scheduler'::"text"))));



CREATE POLICY "Scheduling admins manage locations" ON "public"."locations" TO "authenticated" USING (("public"."is_approved_user"() AND ("public"."has_role"('super_admin'::"text") OR "public"."has_role"('umpire_chief'::"text") OR "public"."has_role"('scheduler'::"text")))) WITH CHECK (("public"."is_approved_user"() AND ("public"."has_role"('super_admin'::"text") OR "public"."has_role"('umpire_chief'::"text") OR "public"."has_role"('scheduler'::"text"))));



CREATE POLICY "Scheduling admins manage seasons" ON "public"."seasons" TO "authenticated" USING (("public"."is_approved_user"() AND ("public"."has_role"('super_admin'::"text") OR "public"."has_role"('umpire_chief'::"text") OR "public"."has_role"('scheduler'::"text")))) WITH CHECK (("public"."is_approved_user"() AND ("public"."has_role"('super_admin'::"text") OR "public"."has_role"('umpire_chief'::"text") OR "public"."has_role"('scheduler'::"text"))));



CREATE POLICY "Scheduling admins manage teams" ON "public"."teams" TO "authenticated" USING (("public"."is_approved_user"() AND ("public"."has_role"('super_admin'::"text") OR "public"."has_role"('umpire_chief'::"text") OR "public"."has_role"('scheduler'::"text")))) WITH CHECK (("public"."is_approved_user"() AND ("public"."has_role"('super_admin'::"text") OR "public"."has_role"('umpire_chief'::"text") OR "public"."has_role"('scheduler'::"text"))));



CREATE POLICY "Scheduling admins read account admin details" ON "public"."account_admin_details" FOR SELECT TO "authenticated" USING ("public"."is_scheduling_admin"());



CREATE POLICY "Scheduling admins read invitations" ON "public"."umpire_invitations" FOR SELECT TO "authenticated" USING ("public"."is_scheduling_admin"());



CREATE POLICY "Scheduling admins read the email outbox" ON "public"."email_outbox" FOR SELECT TO "authenticated" USING ("public"."is_scheduling_admin"());



CREATE POLICY "Scheduling admins update account admin details" ON "public"."account_admin_details" FOR UPDATE TO "authenticated" USING ("public"."is_scheduling_admin"()) WITH CHECK ("public"."is_scheduling_admin"());



CREATE POLICY "Super admins grant roles" ON "public"."user_roles" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_approved_user"() AND "public"."has_role"('super_admin'::"text") AND (("granted_by" = ( SELECT "auth"."uid"() AS "uid")) OR ("granted_by" IS NULL))));



CREATE POLICY "Super admins revoke roles" ON "public"."user_roles" FOR DELETE TO "authenticated" USING (("public"."is_approved_user"() AND "public"."has_role"('super_admin'::"text")));



CREATE POLICY "Umpires and admins can add availability" ON "public"."umpire_availability" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_scheduling_admin"() OR ("public"."is_approved_user"() AND (EXISTS ( SELECT 1
   FROM "public"."umpires" "u"
  WHERE (("u"."id" = "umpire_availability"."umpire_id") AND ("u"."profile_id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "Umpires and admins can add repeating availability" ON "public"."umpire_availability_patterns" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_scheduling_admin"() OR ("public"."is_approved_user"() AND (EXISTS ( SELECT 1
   FROM "public"."umpires" "u"
  WHERE (("u"."id" = "umpire_availability_patterns"."umpire_id") AND ("u"."profile_id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "Umpires and admins can delete availability" ON "public"."umpire_availability" FOR DELETE TO "authenticated" USING (("public"."is_scheduling_admin"() OR ("public"."is_approved_user"() AND (EXISTS ( SELECT 1
   FROM "public"."umpires" "u"
  WHERE (("u"."id" = "umpire_availability"."umpire_id") AND ("u"."profile_id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "Umpires and admins can delete repeating availability" ON "public"."umpire_availability_patterns" FOR DELETE TO "authenticated" USING (("public"."is_scheduling_admin"() OR ("public"."is_approved_user"() AND (EXISTS ( SELECT 1
   FROM "public"."umpires" "u"
  WHERE (("u"."id" = "umpire_availability_patterns"."umpire_id") AND ("u"."profile_id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "Umpires and admins can update availability" ON "public"."umpire_availability" FOR UPDATE TO "authenticated" USING (("public"."is_scheduling_admin"() OR ("public"."is_approved_user"() AND (EXISTS ( SELECT 1
   FROM "public"."umpires" "u"
  WHERE (("u"."id" = "umpire_availability"."umpire_id") AND ("u"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))))))) WITH CHECK (("public"."is_scheduling_admin"() OR ("public"."is_approved_user"() AND (EXISTS ( SELECT 1
   FROM "public"."umpires" "u"
  WHERE (("u"."id" = "umpire_availability"."umpire_id") AND ("u"."profile_id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "Umpires and admins can update repeating availability" ON "public"."umpire_availability_patterns" FOR UPDATE TO "authenticated" USING (("public"."is_scheduling_admin"() OR ("public"."is_approved_user"() AND (EXISTS ( SELECT 1
   FROM "public"."umpires" "u"
  WHERE (("u"."id" = "umpire_availability_patterns"."umpire_id") AND ("u"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))))))) WITH CHECK (("public"."is_scheduling_admin"() OR ("public"."is_approved_user"() AND (EXISTS ( SELECT 1
   FROM "public"."umpires" "u"
  WHERE (("u"."id" = "umpire_availability_patterns"."umpire_id") AND ("u"."profile_id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "Umpires and admins can view availability" ON "public"."umpire_availability" FOR SELECT TO "authenticated" USING (("public"."is_approved_admin"() OR ("public"."is_approved_user"() AND (EXISTS ( SELECT 1
   FROM "public"."umpires" "u"
  WHERE (("u"."id" = "umpire_availability"."umpire_id") AND ("u"."profile_id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "Umpires and admins can view repeating availability" ON "public"."umpire_availability_patterns" FOR SELECT TO "authenticated" USING (("public"."is_approved_admin"() OR ("public"."is_approved_user"() AND (EXISTS ( SELECT 1
   FROM "public"."umpires" "u"
  WHERE (("u"."id" = "umpire_availability_patterns"."umpire_id") AND ("u"."profile_id" = ( SELECT "auth"."uid"() AS "uid"))))))));



ALTER TABLE "public"."account_admin_details" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."account_contact" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."divisions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_outbox" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."game_assignment_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."game_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."games" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leagues" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."little_league_age_chart_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."little_league_age_charts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."seasons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."umpire_availability" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."umpire_availability_patterns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."umpire_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."umpire_private_details" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."umpires" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."admin_confirm_assignment"("p_game_id" "uuid", "p_umpire_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_confirm_assignment"("p_game_id" "uuid", "p_umpire_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."approve_umpire_registration"("p_profile_id" "uuid", "p_classification" "text", "p_birth_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."approve_umpire_registration"("p_profile_id" "uuid", "p_classification" "text", "p_birth_date" "date") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."check_availability_pattern"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."claim_registration"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_registration"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."confirm_assignment"("p_game_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."confirm_assignment"("p_game_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."decline_assignment"("p_game_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."decline_assignment"("p_game_id" "uuid", "p_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."enforce_account_contact_rules"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."enforce_role_assignment_rules"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."enqueue_email"("p_kind" "text", "p_to_email" "text", "p_subject" "text", "p_body" "text", "p_to_profile_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."game_open_places"("p_game_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."game_summary_text"("p_game_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."game_umpire_eligibility"("p_game_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."game_umpire_eligibility"("p_game_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."has_role"("required_role" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."has_role"("required_role" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."import_age_chart"("p_chart_year" integer, "p_name" "text", "p_entries" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."import_age_chart"("p_chart_year" integer, "p_name" "text", "p_entries" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."import_games"("p_season_id" "uuid", "p_new_teams" "jsonb", "p_new_locations" "jsonb", "p_games" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."import_games"("p_season_id" "uuid", "p_new_teams" "jsonb", "p_new_locations" "jsonb", "p_games" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."import_season"("p_league_id" "uuid", "p_season" "jsonb", "p_divisions" "jsonb", "p_teams" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."import_season"("p_league_id" "uuid", "p_season" "jsonb", "p_divisions" "jsonb", "p_teams" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."invite_umpire"("p_umpire_id" "uuid", "p_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."invite_umpire"("p_umpire_id" "uuid", "p_email" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."is_approved_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_approved_admin"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."is_approved_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_approved_user"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."is_scheduling_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_scheduling_admin"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."keep_alive"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."keep_alive"() TO "anon";
GRANT ALL ON FUNCTION "public"."keep_alive"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."ll_age_for_season"("p_season_id" "uuid", "p_birth_year" integer, "p_birth_month" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."ll_age_for_season"("p_season_id" "uuid", "p_birth_year" integer, "p_birth_month" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."mark_email_sent"("p_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_email_sent"("p_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."my_umpire_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."my_umpire_id"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."notice_admins"("p_kind" "text", "p_subject" "text", "p_body" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."notice_umpire"("p_umpire_id" "uuid", "p_kind" "text", "p_subject" "text", "p_body" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."position_phrase"("p" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."queue_email"("p_kind" "text", "p_to_email" "text", "p_subject" "text", "p_body" "text", "p_to_profile_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."queue_email"("p_kind" "text", "p_to_email" "text", "p_subject" "text", "p_body" "text", "p_to_profile_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."queue_notice"("p_kind" "text", "p_to_email" "text", "p_to_profile" "uuid", "p_subject" "text", "p_body" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."queue_self_assign_digest"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."queue_self_assign_digest"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."queue_unconfirmed_warnings"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."queue_unconfirmed_warnings"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."reject_umpire_registration"("p_profile_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reject_umpire_registration"("p_profile_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."renew_umpire_invitation"("p_invitation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."renew_umpire_invitation"("p_invitation_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."revoke_umpire_invitation"("p_invitation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."revoke_umpire_invitation"("p_invitation_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."self_assign"("p_game_id" "uuid", "p_place" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."self_assign"("p_game_id" "uuid", "p_place" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."self_assign_options"("p_from" timestamp with time zone, "p_to" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."self_assign_options"("p_from" timestamp with time zone, "p_to" timestamp with time zone) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."set_account_status"("target_user_id" "uuid", "new_status" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_account_status"("target_user_id" "uuid", "new_status" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."set_game_umpires"("p_game_id" "uuid", "p_umpires" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_game_umpires"("p_game_id" "uuid", "p_umpires" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."skip_email"("p_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."skip_email"("p_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."umpire_game_check"("p_umpire_id" "uuid", "p_game_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."umpire_game_check"("p_umpire_id" "uuid", "p_game_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."umpire_game_check_internal"("p_umpire_id" "uuid", "p_game_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."umpire_notice_email"("p_umpire_id" "uuid") FROM PUBLIC;


















GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."account_admin_details" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."account_admin_details" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."account_contact" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."account_contact" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."divisions" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."divisions" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."email_outbox" TO "service_role";
GRANT SELECT ON TABLE "public"."email_outbox" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."game_assignment_events" TO "service_role";
GRANT SELECT ON TABLE "public"."game_assignment_events" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."game_assignments" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."game_assignments" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."games" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."games" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."leagues" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."leagues" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."little_league_age_chart_entries" TO "service_role";
GRANT SELECT ON TABLE "public"."little_league_age_chart_entries" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."little_league_age_charts" TO "service_role";
GRANT SELECT ON TABLE "public"."little_league_age_charts" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."locations" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."locations" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "service_role";
GRANT SELECT ON TABLE "public"."profiles" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."roles" TO "service_role";
GRANT SELECT ON TABLE "public"."roles" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."seasons" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."seasons" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."teams" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."teams" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."umpire_availability" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."umpire_availability" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."umpire_availability_patterns" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."umpire_availability_patterns" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."umpire_invitations" TO "service_role";
GRANT SELECT ON TABLE "public"."umpire_invitations" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."umpire_private_details" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."umpire_private_details" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."umpires" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."umpires" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_roles" TO "service_role";
GRANT SELECT,INSERT,DELETE ON TABLE "public"."user_roles" TO "authenticated";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";



































