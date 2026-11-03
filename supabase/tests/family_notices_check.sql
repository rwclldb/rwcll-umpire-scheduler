-- RWCLL check: families, part 2 (consent wording, parents copied on notices, turning 18).
--
-- Run in the Supabase SQL Editor AFTER applying 20261110100000_add_family_notices_and_wording.sql
-- (and the families migrations before it).
--
-- It builds its own accounts, umpires, parents and games, then acts as each of them. It ENDS WITH A
-- RED ERROR on purpose: the report is carried in the error message, and raising an error guarantees
-- everything it created (including the messages it queued) is rolled back. NOTHING IS SENT, and your
-- real data and settings are not changed.
--
-- Real arrivals and queued reminders are set aside INSIDE the run so they cannot change the counts.
--
--   PASS   the rule behaved as intended
--   FAIL   something invalid was allowed, or something valid was refused

do $$
declare
  report text[] := '{}';
  failures integer := 0;
  stamp text := replace(gen_random_uuid()::text, '-', '');
  ca date := (now() at time zone 'America/Los_Angeles')::date;
  t_admin uuid;
  ch_acct uuid := gen_random_uuid(); x_acct uuid := gen_random_uuid(); pend uuid := gen_random_uuid();
  par1 uuid := gen_random_uuid(); par2 uuid := gen_random_uuid(); par3 uuid := gen_random_uuid(); par4 uuid := gen_random_uuid();
  par_same uuid := gen_random_uuid(); par_pend uuid := gen_random_uuid();
  y1_acct uuid := gen_random_uuid(); y3_acct uuid := gen_random_uuid(); t18_acct uuid := gen_random_uuid(); c18_acct uuid := gen_random_uuid(); ad_acct uuid := gen_random_uuid();
  l1 uuid; s1 uuid; d1 uuid; tm1 uuid; tm2 uuid; loc uuid; g_r uuid;
  um_y uuid; um_nomail uuid; um_ad uuid; um_same uuid; um_kid uuid; um_unk uuid; um_16 uuid;
  um_18 uuid; um_18b uuid; um_17 uuid; um_18c uuid;
  link_ended uuid;
  n bigint; n2 bigint; b boolean; v integer; txt text; txt2 text; v1 text; v2 text;
begin
  select p.id into t_admin
  from public.profiles p
  join public.user_roles ur on ur.user_id = p.id
  where ur.role_id = 'super_admin' and p.account_status = 'approved'
  limit 1;

  if t_admin is null then
    raise exception 'This check needs an approved super admin.';
  end if;

  begin
    insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
    select a, 'chk-' || stamp || '-' || i || '@example.org', now(), m::jsonb
    from (values
      (ch_acct, 'ch', '{}'), (x_acct, 'x', '{}'), (pend, 'pend', '{"signup_kind":"parent_guardian"}'),
      (par1, 'par1', '{"signup_kind":"parent_guardian"}'), (par2, 'par2', '{"signup_kind":"parent_guardian"}'),
      (par3, 'par3', '{"signup_kind":"parent_guardian"}'), (par4, 'par4', '{"signup_kind":"parent_guardian"}'),
      (par_same, 'parsame', '{"signup_kind":"parent_guardian"}'), (par_pend, 'parpend', '{"signup_kind":"parent_guardian"}'),
      (y1_acct, 'y1', '{}'), (y3_acct, 'y3', '{}'), (t18_acct, 't18', '{}'), (c18_acct, 'c18', '{}'), (ad_acct, 'ad', '{}')
    ) as t(a, i, m);
  exception when others then
    raise exception 'This check could not create test accounts here: %', sqlerrm;
  end;
  update public.profiles set account_status = 'approved' where id in (ch_acct, x_acct, par1, par2, par3, par4, par_same, y1_acct, y3_acct, t18_acct, c18_acct, ad_acct);
  update public.profiles set display_name = 'CHK Parent One ' || stamp where id = par1;
  update public.profiles set display_name = 'CHK Parent Two ' || stamp where id = par2;
  update public.profiles set display_name = 'CHK Chief ' || stamp where id = ch_acct;
  insert into public.user_roles (user_id, role_id) values
    (ch_acct, 'umpire_chief'), (par1, 'parent_guardian'), (par2, 'parent_guardian'), (par3, 'parent_guardian'), (par4, 'parent_guardian'),
    (par_same, 'parent_guardian'), (y1_acct, 'youth_umpire'), (y3_acct, 'youth_umpire'), (t18_acct, 'youth_umpire'), (c18_acct, 'youth_umpire'), (ad_acct, 'adult_umpire');

  -- set aside real queued reminders INSIDE this run
  update public.game_assignments set reminded_at = now() where reminded_at is null;

  update public.app_settings set value = '10' where key = 'umpire_min_age';
  update public.app_settings set value = '13' where key = 'parent_consent_below_age';
  update public.sending_settings set value = '' where key = 'app_url';

  insert into public.leagues (name) values ('CHK L1 ' || stamp) returning id into l1;
  insert into public.seasons (name) values ('CHK S1 ' || stamp) returning id into s1;
  insert into public.locations (name) values ('CHK Field ' || stamp) returning id into loc;
  insert into public.divisions (league_id, name) values (l1, 'CHK Fam Div') returning id into d1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'Hawks', d1) returning id into tm1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'Owls', d1) returning id into tm2;

  insert into public.umpires (display_name, classification, profile_id) values ('CHK Youth ' || stamp, 'youth', y1_acct) returning id into um_y;
  insert into public.umpires (display_name, classification) values ('CHK NoMail ' || stamp, 'youth') returning id into um_nomail;
  insert into public.umpires (display_name, classification, profile_id) values ('CHK Adult ' || stamp, 'adult', ad_acct) returning id into um_ad;
  insert into public.umpires (display_name, classification) values ('CHK SameMail ' || stamp, 'youth') returning id into um_same;
  insert into public.umpires (display_name, classification) values ('CHK Kid ' || stamp, 'youth') returning id into um_kid;
  insert into public.umpires (display_name, classification) values ('CHK Unknown ' || stamp, 'youth') returning id into um_unk;
  insert into public.umpires (display_name, classification) values ('CHK Sixteen ' || stamp, 'youth') returning id into um_16;
  insert into public.umpires (display_name, classification, profile_id) values ('CHK Eighteen ' || stamp, 'youth', t18_acct) returning id into um_18;
  insert into public.umpires (display_name, classification) values ('CHK Nineteen ' || stamp, 'youth') returning id into um_18b;
  insert into public.umpires (display_name, classification) values ('CHK Almost ' || stamp, 'youth') returning id into um_17;
  insert into public.umpires (display_name, classification, profile_id) values ('CHK Manual18 ' || stamp, 'youth', c18_acct) returning id into um_18c;
  insert into public.umpire_private_details (umpire_id, birth_date) values
    (um_y, ((ca - interval '16 years' - interval '30 days')::date)), (um_kid, ((ca - interval '11 years' - interval '30 days')::date)), (um_16, ((ca - interval '16 years' - interval '30 days')::date)),
    (um_18, (ca - interval '18 years')::date), (um_18b, ((ca - interval '19 years' - interval '30 days')::date)), (um_17, (ca - interval '18 years' + interval '1 day')::date), (um_18c, ((ca - interval '18 years' - interval '30 days')::date));

  -- one parent has the SAME email address as their child's (the child has no account: the address is on their umpire record), so the parent must not get two copies
  insert into public.umpire_private_details (umpire_id, email) values (um_same, (select email from public.profiles where id = par_same))
    on conflict (umpire_id) do update set email = excluded.email;

  -- links, made directly (the link function is tested in the other script)
  insert into public.family_links (parent_id, umpire_id, relationship, created_by_name) values
    (par1, um_y, 'mother', 'x'), (par2, um_y, 'father', 'x'), (par3, um_y, 'guardian', 'x'),
    (par1, um_nomail, 'mother', 'x'), (par_same, um_same, 'mother', 'x'), (par_pend, um_y, 'other', 'x'),
    (par1, um_kid, 'mother', 'x'), (par1, um_18, 'mother', 'x'), (par2, um_18b, 'father', 'x'),
    (par1, um_17, 'mother', 'x'), (par2, um_18c, 'mother', 'x');
  insert into public.family_links (parent_id, umpire_id, relationship, created_by_name, ended_at, ended_by_name) values (par4, um_y, 'other', 'x', now(), 'x');
  -- par3 has the parent role taken away; par_pend is not approved
  delete from public.user_roles where user_id = par3 and role_id = 'parent_guardian';
  update public.umpires set payee_profile_id = par1 where id in (um_18, um_17);

  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc, now() + interval '24 hours', now() + interval '26 hours') returning id into g_r;
  update public.games set status = 'scheduled' where id = g_r;

  ----------------------------------------------------------------
  -- 1. The consent wording
  ----------------------------------------------------------------
  -- W1
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    null;
    reset role;
    if (select is_sample and strpos(body, '{child}') > 0 and strpos(body, '[[') > 0 from public.consent_wordings where version = '2026-11-sample') then report := array_append(report, ('PASS  W1  the migration leaves a SAMPLE wording, with {child} and [[placeholders]] for the league to replace')::text); else report := array_append(report, ('FAIL  W1  the sample wording was missing')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  W1  the sample wording was missing: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- W2
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.current_consent_wording();
    reset role;
    if n = 1 then report := array_append(report, ('PASS  W2  an approved parent can read the current wording')::text); else report := array_append(report, ('FAIL  W2  a parent could not read the wording')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  W2  a parent could not read the wording: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- W3
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.current_consent_wording();
    reset role;
    if n = 1 then report := array_append(report, ('PASS  W3  so can any approved account')::text); else report := array_append(report, ('FAIL  W3  an approved account could not read the wording')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  W3  an approved account could not read the wording: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- W4
  begin
    perform set_config('request.jwt.claim.sub', pend::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', pend, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform * from public.current_consent_wording();
    reset role;
    report := array_append(report, ('FAIL  W4  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%approved accounts%' then report := array_append(report, ('PASS  W4  a pending account cannot')::text); else report := array_append(report, ('FAIL  W4  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W5
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform * from public.current_consent_wording();
    reset role;
    report := array_append(report, ('FAIL  W5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W5  a signed-out visitor cannot')::text); else report := array_append(report, ('FAIL  W5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W6
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_consent_wording('I am the parent of {child} and I agree, for the league, to this very long text of words here.');
    reset role;
    report := array_append(report, ('FAIL  W6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin%' then report := array_append(report, ('PASS  W6  an umpire chief cannot change the wording (only a super admin can)')::text); else report := array_append(report, ('FAIL  W6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W7
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_consent_wording('I am the parent of {child} and I agree, for the league, to this very long text of words here.');
    reset role;
    report := array_append(report, ('FAIL  W7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin%' then report := array_append(report, ('PASS  W7  a parent cannot change the wording (only a super admin can)')::text); else report := array_append(report, ('FAIL  W7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W8
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_consent_wording('I am the parent of {child} and I agree, for the league, to this very long text of words here.');
    reset role;
    report := array_append(report, ('FAIL  W8  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin%' then report := array_append(report, ('PASS  W8  an ordinary account cannot change the wording (only a super admin can)')::text); else report := array_append(report, ('FAIL  W8  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W9
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.set_consent_wording('I am the parent of {child} and I agree, for the league, to this very long text of words here.');
    reset role;
    report := array_append(report, ('FAIL  W9  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W9  a signed-out visitor cannot change it')::text); else report := array_append(report, ('FAIL  W9  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W10
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_consent_wording('too short {child}');
    reset role;
    report := array_append(report, ('FAIL  W10  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%between 50 and 4000%' then report := array_append(report, ('PASS  W10  wording under 50 characters is refused')::text); else report := array_append(report, ('FAIL  W10  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W11
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_consent_wording('{child} ' || repeat('x', 4000));
    reset role;
    report := array_append(report, ('FAIL  W11  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%between 50 and 4000%' then report := array_append(report, ('PASS  W11  ...and over 4000')::text); else report := array_append(report, ('FAIL  W11  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W12
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_consent_wording(repeat('a', 80));
    reset role;
    report := array_append(report, ('FAIL  W12  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%must include {child}%' then report := array_append(report, ('PASS  W12  wording without {child} is refused (the child''s name has to appear)')::text); else report := array_append(report, ('FAIL  W12  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W13
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_consent_wording(null);
    reset role;
    report := array_append(report, ('FAIL  W13  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%between 50 and 4000%' then report := array_append(report, ('PASS  W13  missing wording is refused')::text); else report := array_append(report, ('FAIL  W13  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W14
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.set_consent_wording('SAMPLE [[replace me]] I am the parent or legal guardian of {child} and I give permission for {child} to umpire games.') into txt;
    reset role;
    if txt ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]+$' and (select is_sample from public.consent_wordings where version = txt) and (select count(*) from public.family_log where action = 'consent_wording_changed' and detail like '%' || txt || '%' and detail like '%placeholders%') = 1 then report := array_append(report, ('PASS  W14  a super admin saves new wording: it gets a dated version number, and wording that still has [[placeholders]] is marked as a sample and logged as such')::text); else report := array_append(report, ('FAIL  W14  the sample wording was not saved properly')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  W14  the sample wording was not saved properly: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- (setup, not a test: a parent is linked to a child who needs consent; the current wording is the unfinished sample)
  reset role;
  select version into v1 from public.consent_wordings order by seq desc limit 1;

  -- W15
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select version, is_sample into txt, b from public.current_consent_wording();
    reset role;
    if txt = v1 and b then report := array_append(report, ('PASS  W15  the current wording is the one just saved, and it says it is a sample')::text); else report := array_append(report, ('FAIL  W15  the current wording was wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  W15  the current wording was wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- W16
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.give_consent(um_kid, v1);
    reset role;
    report := array_append(report, ('FAIL  W16  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%has not finished the consent wording%' then report := array_append(report, ('PASS  W16  while the wording still has [[placeholders]], consent CANNOT be given (nobody consents to unfinished text)')::text); else report := array_append(report, ('FAIL  W16  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W17
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.set_consent_wording('I am the parent or legal guardian of {child}. I give permission for {child} to umpire games for the league, and I can withdraw this any time.') into txt;
    reset role;
    if txt <> v1 and not (select is_sample from public.consent_wordings where version = txt) then report := array_append(report, ('PASS  W17  a super admin saves finished wording: a new version, not a sample')::text); else report := array_append(report, ('FAIL  W17  the finished wording was not saved')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  W17  the finished wording was not saved: ' || sqlerrm)::text); failures := failures + 1;
  end;

  reset role;
  select version into v2 from public.consent_wordings order by seq desc limit 1;

  -- W18
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    null;
    reset role;
    if split_part(v2, '-', 4)::integer > split_part(v1, '-', 4)::integer and split_part(v2, '-', 1) = split_part(v1, '-', 1) and split_part(v2, '-', 2) = split_part(v1, '-', 2) and split_part(v2, '-', 3) = split_part(v1, '-', 3) then report := array_append(report, ('PASS  W18  a second save on the same day gets the next number (the old version is kept)')::text); else report := array_append(report, ('FAIL  W18  the version numbers did not follow on')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  W18  the version numbers did not follow on: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- W19
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.give_consent(um_kid, v1);
    reset role;
    report := array_append(report, ('FAIL  W19  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%wording has changed%' then report := array_append(report, ('PASS  W19  consent against an OLD version is refused: the parent must read the current wording')::text); else report := array_append(report, ('FAIL  W19  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W20
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.give_consent(um_kid, v2);
    reset role;
    if exists (select 1 from public.parental_consents where umpire_id = um_kid and parent_id = par1 and withdrawn_at is null and text_version = v2) then report := array_append(report, ('PASS  W20  consent against the current version is recorded, with that version')::text); else report := array_append(report, ('FAIL  W20  consent was not recorded')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  W20  consent was not recorded: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- W21
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_consent_wording('Changed again: I am the parent or legal guardian of {child} and give permission for {child} to umpire games for the league.');
    reset role;
    if not public.umpire_blocked_by_consent(um_kid) then report := array_append(report, ('PASS  W21  changing the wording later does NOT take away consent already given')::text); else report := array_append(report, ('FAIL  W21  a wording change removed consent')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  W21  a wording change removed consent: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- W22
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.consent_wordings;
    reset role;
    if n >= 4 then report := array_append(report, ('PASS  W22  an umpire chief can read every version of the wording')::text); else report := array_append(report, ('FAIL  W22  the chief could not read the versions')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  W22  the chief could not read the versions: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- W23
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.consent_wordings;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  W23  a parent cannot read the table directly (only the current wording, through the function)')::text); else report := array_append(report, ('FAIL  W23  a parent read the wording history')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  W23  a parent read the wording history: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- W24
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.consent_wordings (version, body, created_by_name) values ('x', repeat('a', 60), 'x');
    reset role;
    report := array_append(report, ('FAIL  W24  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W24  nobody writes the wording table directly, not even a super admin')::text); else report := array_append(report, ('FAIL  W24  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- 2. Younger umpires: an unknown age counts as needing consent while the minimum age is below 13
  ----------------------------------------------------------------
  -- U1
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    null;
    reset role;
    if public.umpire_needs_consent(um_unk) and public.umpire_needs_consent(um_kid) and not public.umpire_needs_consent(um_16) and not public.umpire_needs_consent(um_ad) then report := array_append(report, ('PASS  U1  with minimum age 10: a youth with no birth date needs consent (like an 11-year-old), a 16-year-old and an adult do not')::text); else report := array_append(report, ('FAIL  U1  the unknown-age rule was wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U1  the unknown-age rule was wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- (setup, not a test: the minimum age goes back to 13)
  reset role;
  update public.app_settings set value = '13' where key = 'umpire_min_age';

  -- U2
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    null;
    reset role;
    if not public.umpire_needs_consent(um_unk) and public.umpire_needs_consent(um_kid) then report := array_append(report, ('PASS  U2  with minimum age 13, a youth with no birth date needs no consent (nothing changes for today''s rule); a known 11-year-old still does')::text); else report := array_append(report, ('FAIL  U2  the rule changed when it should not')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U2  the rule changed when it should not: ' || sqlerrm)::text); failures := failures + 1;
  end;

  reset role;
  update public.app_settings set value = '10' where key = 'umpire_min_age';

  -- U3
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.game_assignments (game_id, umpire_id, position) values (g_r, um_unk, 'plate');
    reset role;
    report := array_append(report, ('FAIL  U3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%needs a parent or guardian''s consent%' then report := array_append(report, ('PASS  U3  a youth with no birth date cannot be assigned (minimum age 10) until a parent consents or the date is entered')::text); else report := array_append(report, ('FAIL  U3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- 3. Parents are copied on every notice
  ----------------------------------------------------------------
  -- N1
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    perform public.notice_umpire(um_y, 'assignment', 'You umpire Saturday', 'Body ' || stamp);
    reset role;
    if (select count(*) from public.email_outbox where to_email = ('chk-' || stamp || '-y1@example.org') and subject like 'You umpire Saturday') = 1 then report := array_append(report, ('PASS  N1  the umpire gets the message')::text); else report := array_append(report, ('FAIL  N1  the umpire''s own message was missing')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  N1  the umpire''s own message was missing: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- N2
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    null;
    reset role;
    if (select count(*) from public.email_outbox where to_email = ('chk-' || stamp || '-par1@example.org') and subject like 'Copy for CHK Youth %: You umpire Saturday') = 1 and (select count(*) from public.email_outbox where to_email = ('chk-' || stamp || '-par2@example.org') and subject like 'Copy for CHK Youth %: You umpire Saturday') = 1 then report := array_append(report, ('PASS  N2  each linked parent (the mother and the father) gets a copy, marked ''Copy for <name>''')::text); else report := array_append(report, ('FAIL  N2  a parent''s copy was missing')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  N2  a parent''s copy was missing: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- N3
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    null;
    reset role;
    if (select body from public.email_outbox where to_email = ('chk-' || stamp || '-par1@example.org') and subject like 'Copy for CHK Youth%You umpire Saturday') like 'This is a copy of a message sent to CHK Youth %.%Body %' then report := array_append(report, ('PASS  N3  the copy says what it is, then repeats the message')::text); else report := array_append(report, ('FAIL  N3  the copy''s text was wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  N3  the copy''s text was wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- N4
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    null;
    reset role;
    if (select count(*) from public.email_outbox where kind = 'assignment' and to_email in (('chk-' || stamp || '-y1@example.org'), ('chk-' || stamp || '-par1@example.org'), ('chk-' || stamp || '-par2@example.org')) and subject like '%You umpire Saturday') = 3 then report := array_append(report, ('PASS  N4  the copies keep the kind of message (an assignment is still an assignment)')::text); else report := array_append(report, ('FAIL  N4  a copy had the wrong kind')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  N4  a copy had the wrong kind: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- N5
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    null;
    reset role;
    if (select count(*) from public.email_outbox where to_email = ('chk-' || stamp || '-par3@example.org') and subject like '%You umpire Saturday') = 0 then report := array_append(report, ('PASS  N5  a guardian who is no longer a parent account (the role was removed) gets no copy')::text); else report := array_append(report, ('FAIL  N5  a copy went to someone without the parent role')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  N5  a copy went to someone without the parent role: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- N6
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    null;
    reset role;
    if (select count(*) from public.email_outbox where to_email = 'chk-' || stamp || '-parpend@example.org') = 0 and (select count(*) from public.email_outbox where to_email = ('chk-' || stamp || '-par4@example.org') and subject like '%You umpire Saturday') = 0 then report := array_append(report, ('PASS  N6  a parent who is not approved, and one whose link ENDED, get no copy')::text); else report := array_append(report, ('FAIL  N6  a copy went to someone who should not get one')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  N6  a copy went to someone who should not get one: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- N7
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    null;
    reset role;
    if (select count(*) from public.email_outbox where subject like '%You umpire Saturday' and body like '%Body ' || stamp || '%') = 3 then report := array_append(report, ('PASS  N7  so exactly three messages were queued: the umpire and two parents')::text); else report := array_append(report, ('FAIL  N7  the wrong number of messages was queued')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  N7  the wrong number of messages was queued: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- N8
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    perform public.notice_umpire(um_nomail, 'schedule_change', 'Game moved', 'Body ' || stamp);
    reset role;
    if (select count(*) from public.email_outbox where subject = 'Copy for CHK NoMail ' || stamp || ': Game moved' and to_email = ('chk-' || stamp || '-par1@example.org')) = 1 and (select count(*) from public.email_outbox where subject like '%Game moved' and body like '%Body ' || stamp || '%') = 1 then report := array_append(report, ('PASS  N8  a youth with no email of their own: the parent still gets the message (the only one sent)')::text); else report := array_append(report, ('FAIL  N8  a youth with no email was handled wrongly')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  N8  a youth with no email was handled wrongly: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- N9
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    perform public.notice_umpire(um_ad, 'assignment', 'Adult game', 'Body ' || stamp);
    reset role;
    if (select count(*) from public.email_outbox where to_email = ('chk-' || stamp || '-ad@example.org') and subject like 'Adult game') = 1 and (select count(*) from public.email_outbox where subject like '%Adult game' and body like '%Body ' || stamp || '%') = 1 then report := array_append(report, ('PASS  N9  an adult umpire gets only their own message, no copies')::text); else report := array_append(report, ('FAIL  N9  an adult''s message was copied')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  N9  an adult''s message was copied: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- N10
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    perform public.notice_umpire(um_same, 'assignment', 'Same address', 'Body ' || stamp);
    reset role;
    if (select count(*) from public.email_outbox where to_email = (select email from public.profiles where id = par_same) and subject like '%Same address') = 1 and (select count(*) from public.email_outbox where subject like '%Same address' and body like '%Body ' || stamp || '%') = 1 then report := array_append(report, ('PASS  N10  a parent with the same email address as the child gets one message, not two')::text); else report := array_append(report, ('FAIL  N10  the same address got two messages')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  N10  the same address got two messages: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- (setup, not a test: the day-before reminder runs for the child's game tomorrow)
  reset role;
  insert into public.game_assignments (game_id, umpire_id, position) values (g_r, um_y, 'plate');

  -- N11
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    select public.queue_game_reminders() into v;
    reset role;
    if v >= 1 and (select count(*) from public.email_outbox where to_email = ('chk-' || stamp || '-y1@example.org') and subject like 'Reminder: you umpire tomorrow') = 1 and (select count(*) from public.email_outbox where to_email = ('chk-' || stamp || '-par1@example.org') and subject like 'Copy for CHK Youth %: Reminder: you umpire tomorrow') = 1 and (select count(*) from public.email_outbox where to_email = ('chk-' || stamp || '-par2@example.org') and subject like 'Copy for CHK Youth %: Reminder: you umpire tomorrow') = 1 then report := array_append(report, ('PASS  N11  the real day-before reminder is copied to the parents too')::text); else report := array_append(report, ('FAIL  N11  the reminder was not copied')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  N11  the reminder was not copied: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- 4. Turning 18 happens by itself
  ----------------------------------------------------------------
  -- (setup, not a test: the database's own schedule runs: nobody is signed in)
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
  select public.convert_turned_18() into v;

  -- T1
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    null;
    reset role;
    if v >= 3 and (select classification from public.umpires where id = um_18) = 'adult' and (select classification from public.umpires where id = um_18b) = 'adult' and (select classification from public.umpires where id = um_18c) = 'adult' then report := array_append(report, ('PASS  T1  the schedule changes every youth who has turned 18 (including one whose birthday is TODAY)')::text); else report := array_append(report, ('FAIL  T1  an 18-year-old was not changed')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  T1  an 18-year-old was not changed: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- T2
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    null;
    reset role;
    if (select classification from public.umpires where id = um_17) = 'youth' and (select classification from public.umpires where id = um_y) = 'youth' and (select classification from public.umpires where id = um_kid) = 'youth' then report := array_append(report, ('PASS  T2  ...and nobody younger: one day short of 18 stays a youth')::text); else report := array_append(report, ('FAIL  T2  someone under 18 was changed')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  T2  someone under 18 was changed: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- T3
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    null;
    reset role;
    if not exists (select 1 from public.family_links where umpire_id in (um_18, um_18b, um_18c) and ended_at is null) and (select count(*) from public.family_links where umpire_id = um_17 and ended_at is null) = 1 then report := array_append(report, ('PASS  T3  the parents'' links end for those who turned 18, and not for the one who did not')::text); else report := array_append(report, ('FAIL  T3  the links were not ended properly')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  T3  the links were not ended properly: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- T4
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    null;
    reset role;
    if (select payee_profile_id from public.umpires where id = um_18) is null and public.payee_for_umpire(um_18) = t18_acct and (select payee_profile_id from public.umpires where id = um_17) = par1 then report := array_append(report, ('PASS  T4  the new adult is paid to themselves (the parent payee is cleared); the umpire who did not turn 18 keeps theirs')::text); else report := array_append(report, ('FAIL  T4  the payee was not handled properly')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  T4  the payee was not handled properly: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- T5
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    null;
    reset role;
    if not exists (select 1 from public.user_roles where user_id = t18_acct and role_id = 'youth_umpire') and exists (select 1 from public.user_roles where user_id = t18_acct and role_id = 'adult_umpire') then report := array_append(report, ('PASS  T5  their account''s role changes from youth umpire to adult umpire')::text); else report := array_append(report, ('FAIL  T5  the roles were not swapped')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  T5  the roles were not swapped: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- T6
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    null;
    reset role;
    if (select count(*) from public.family_log where action = 'converted_to_adult' and actor_name = 'The system' and detail like '%CHK Eighteen%' || stamp || '%') = 1 then report := array_append(report, ('PASS  T6  the change is logged as made by ''The system''')::text); else report := array_append(report, ('FAIL  T6  the log did not say the system did it')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  T6  the log did not say the system did it: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- T7
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    null;
    reset role;
    if (select count(*) from public.email_outbox where to_email = ('chk-' || stamp || '-par1@example.org') and subject like 'CHK Eighteen % is now an adult umpire') = 1 and (select body from public.email_outbox where to_email = ('chk-' || stamp || '-par1@example.org') and subject like 'CHK Eighteen % is now an adult umpire') like '%no longer be copied%made to them directly%' then report := array_append(report, ('PASS  T7  the parent is told the umpire is now an adult, that they will no longer be copied, and that payments are made to them directly')::text); else report := array_append(report, ('FAIL  T7  the parent''s notice was missing or wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  T7  the parent''s notice was missing or wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- T8
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    null;
    reset role;
    if (select count(*) from public.email_outbox where to_email = ('chk-' || stamp || '-par2@example.org') and subject like 'CHK Nineteen % is now an adult umpire') = 1 then report := array_append(report, ('PASS  T8  a parent of an umpire with no account is told too')::text); else report := array_append(report, ('FAIL  T8  that parent was not told')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  T8  that parent was not told: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- T9
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    null;
    reset role;
    if (select count(*) from public.email_outbox where to_email = ('chk-' || stamp || '-t18@example.org') and subject like 'You are now an adult umpire: please set up your payment account') = 1 and (select body from public.email_outbox where to_email = ('chk-' || stamp || '-t18@example.org') and subject like 'You are now an adult umpire%') like '%made to YOU directly%Stripe%Set up payments%' then report := array_append(report, ('PASS  T9  the new adult is told they must set up their own payment account (Stripe), and that payments now go to them')::text); else report := array_append(report, ('FAIL  T9  the new adult''s notice was missing or wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  T9  the new adult''s notice was missing or wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- T10
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    null;
    reset role;
    if not exists (select 1 from public.email_outbox where subject like 'Copy for CHK Eighteen%') then report := array_append(report, ('PASS  T10  the new adult''s own notice is NOT copied to their parents (the links had already ended)')::text); else report := array_append(report, ('FAIL  T10  the notice was copied to a parent')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  T10  the notice was copied to a parent: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- T11
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    null;
    reset role;
    if (select count(*) from public.email_outbox where subject like '% turned 18 and became adult umpires' and body like '%CHK Eighteen%' || stamp || '%' and body like '%CHK Nineteen%' || stamp || '%') >= 1 and (select count(*) from public.email_outbox where to_email = ('chk-' || stamp || '-ch@example.org') and subject like '% turned 18 and became adult umpires') = 1 then report := array_append(report, ('PASS  T11  the administrators are told who was changed (the umpire chief got one summary)')::text); else report := array_append(report, ('FAIL  T11  the administrators were not told')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  T11  the administrators were not told: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- T12
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    select public.convert_turned_18() into v;
    reset role;
    if v = 0 then report := array_append(report, ('PASS  T12  running it again changes nobody (it is safe to run every day)')::text); else report := array_append(report, ('FAIL  T12  a second run changed someone')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  T12  a second run changed someone: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- T13
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.convert_turned_18() into v;
    reset role;
    if v = 0 then report := array_append(report, ('PASS  T13  an umpire chief can run it by hand')::text); else report := array_append(report, ('FAIL  T13  the chief could not run it')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  T13  the chief could not run it: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- T14
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.convert_turned_18();
    reset role;
    report := array_append(report, ('FAIL  T14  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin or umpire chief%' then report := array_append(report, ('PASS  T14  a parent cannot run it')::text); else report := array_append(report, ('FAIL  T14  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- T15
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.convert_turned_18();
    reset role;
    report := array_append(report, ('FAIL  T15  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin or umpire chief%' then report := array_append(report, ('PASS  T15  an ordinary account cannot run it')::text); else report := array_append(report, ('FAIL  T15  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- T16
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.convert_turned_18();
    reset role;
    report := array_append(report, ('FAIL  T16  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  T16  a signed-out visitor from the app cannot')::text); else report := array_append(report, ('FAIL  T16  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- (setup, not a test: a youth turns 18 and an administrator changes them by hand)
  reset role;
  update public.umpire_private_details set birth_date = (ca - interval '18 years' - interval '5 days')::date where umpire_id = um_17;

  -- T17
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.convert_to_adult(um_17);
    reset role;
    if (select classification from public.umpires where id = um_17) = 'adult' and (select count(*) from public.email_outbox where to_email = ('chk-' || stamp || '-par1@example.org') and subject like 'CHK Almost % is now an adult umpire') = 1 then report := array_append(report, ('PASS  T17  changing one by hand sends the same notices')::text); else report := array_append(report, ('FAIL  T17  the manual change did not send the notices')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  T17  the manual change did not send the notices: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- T18
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.convert_to_adult(um_16);
    reset role;
    report := array_append(report, ('FAIL  T18  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%not 18 yet%' then report := array_append(report, ('PASS  T18  (a 16-year-old still cannot be changed by hand)')::text); else report := array_append(report, ('FAIL  T18  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- 5. Withdrawing consent tells the administrators
  ----------------------------------------------------------------
  reset role;
  insert into public.parental_consents (umpire_id, parent_id, text_version) values (um_kid, par1, 'x') on conflict do nothing;

  -- D1
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.withdraw_consent(um_kid);
    reset role;
    if (select count(*) from public.email_outbox where to_email = ('chk-' || stamp || '-ch@example.org') and subject like 'Consent withdrawn for CHK Kid %') = 1 and (select body from public.email_outbox where to_email = ('chk-' || stamp || '-ch@example.org') and subject like 'Consent withdrawn for CHK Kid%') like '%cannot be assigned to games until consent is given again%' then report := array_append(report, ('PASS  D1  when a parent withdraws consent, the umpire chief is told, and that the child cannot be assigned')::text); else report := array_append(report, ('FAIL  D1  the administrators were not told')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  D1  the administrators were not told: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- D2
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.withdraw_consent(um_kid);
    reset role;
    report := array_append(report, ('FAIL  D2  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%no consent to withdraw%' then report := array_append(report, ('PASS  D2  (nothing left to withdraw, and no second notice)')::text); else report := array_append(report, ('FAIL  D2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- D3
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    null;
    reset role;
    if (select count(*) from public.email_outbox where to_email = ('chk-' || stamp || '-ch@example.org') and subject like 'Consent withdrawn for CHK Kid %') = 1 then report := array_append(report, ('PASS  D3  no second notice was sent')::text); else report := array_append(report, ('FAIL  D3  a second notice was queued')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  D3  a second notice was queued: ' || sqlerrm)::text); failures := failures + 1;
  end;


  -- Always end with an error so that nothing can be saved or sent.
  raise exception E'\n\nFAMILY NOTICES CHECK (nothing was sent and nothing was saved; your real data and settings were not changed)\n\n%\n\nFailures: %\n',
    array_to_string(report, E'\n'), failures;
end
$$;
