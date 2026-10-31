-- RWCLL check: game notes.
--
-- Run in the Supabase SQL Editor AFTER applying 20261102100000_add_game_notes.sql
-- (which needs the demo clock migration, 20261101100000, applied first).
--
-- It builds its own league, games, umpires and sign-in accounts, then acts as an
-- umpire on a game, an umpire on another game, an ordinary account, a super admin
-- and a signed-out visitor. It ENDS WITH A RED ERROR on purpose: the report is
-- carried in the error message, and raising an error guarantees that everything
-- it created is rolled back. Your real data is not changed.
--
--   PASS   the rule behaved as intended
--   FAIL   something invalid was allowed, or something valid was refused

do $$
declare
  report text[] := '{}';
  failures integer := 0;
  stamp text := replace(gen_random_uuid()::text, '-', '');
  t_admin uuid; admin_name text;
  a_acct uuid := gen_random_uuid(); b_acct uuid := gen_random_uuid(); x_acct uuid := gen_random_uuid();
  l1 uuid; s1 uuid; loc uuid; d1 uuid; tm1 uuid; tm2 uuid;
  g1 uuid; g2 uuid; g_cancel uuid; g_many uuid;
  um_a uuid; um_b uuid;
  note_a uuid; note_admin uuid; at1 timestamptz;
  n bigint; orig_setting text;
begin
  select p.id, coalesce(nullif(btrim(p.display_name), ''), p.email) into t_admin, admin_name
  from public.profiles p
  join public.user_roles ur on ur.user_id = p.id
  where ur.role_id = 'super_admin' and p.account_status = 'approved'
  limit 1;

  if t_admin is null then
    raise exception 'This check needs an approved super admin.';
  end if;

  begin
    insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
      (a_acct, 'chk-' || stamp || '-a@example.org', now(), '{}'::jsonb),
      (b_acct, 'chk-' || stamp || '-b@example.org', now(), '{}'::jsonb),
      (x_acct, 'chk-' || stamp || '-x@example.org', now(), '{}'::jsonb);
  exception when others then
    raise exception 'This check could not create test accounts here: %', sqlerrm;
  end;
  update public.profiles set account_status = 'approved', display_name = 'CHK Note A ' || stamp where id = a_acct;
  update public.profiles set account_status = 'approved', display_name = 'CHK Note B ' || stamp where id = b_acct;
  update public.profiles set account_status = 'approved', display_name = 'CHK Note X ' || stamp where id = x_acct;

  insert into public.leagues (name) values ('CHK L1 ' || stamp) returning id into l1;
  insert into public.seasons (name) values ('CHK S1 ' || stamp) returning id into s1;
  insert into public.locations (name) values ('CHK Field ' || stamp) returning id into loc;
  insert into public.divisions (league_id, name) values (l1, 'CHK Div') returning id into d1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'T1', d1) returning id into tm1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'T2', d1) returning id into tm2;
  insert into public.umpires (display_name, classification, profile_id) values ('CHK Note Ump A ' || stamp, 'adult', a_acct) returning id into um_a;
  insert into public.umpires (display_name, classification, profile_id) values ('CHK Note Ump B ' || stamp, 'adult', b_acct) returning id into um_b;

  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc, now() + interval '1 day', now() + interval '1 day 2 hours') returning id into g1;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc, now() + interval '2 days', now() + interval '2 days 2 hours') returning id into g2;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at, status) values (s1, d1, tm1, tm2, loc, now() + interval '3 days', now() + interval '3 days 2 hours', 'canceled') returning id into g_cancel;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc, now() + interval '4 days', now() + interval '4 days 2 hours') returning id into g_many;
  insert into public.game_assignments (game_id, umpire_id, position) values (g1, um_a, 'plate'), (g2, um_b, 'plate'), (g_many, um_a, 'plate');

  ----------------------------------------------------------------
  -- Adding a note
  ----------------------------------------------------------------
  -- A1
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_game_note(g1, 'Gate code is 1234');
    reset role;
    if (select count(*) from public.game_notes where game_id = g1) = 1 and (select author_name from public.game_notes where game_id = g1) = admin_name and (select author_id from public.game_notes where game_id = g1) = t_admin then report := array_append(report, ('PASS  A1  an administrator can add a note to any game; it records who wrote it, by name')::text); else report := array_append(report, ('FAIL  A1  the administrator''s note was not saved')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  A1  the administrator''s note was not saved: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- A2
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_game_note(g1, 'Field is soft near first base');
    reset role;
    if (select author_name from public.game_notes where game_id = g1 and body like 'Field is soft%') = 'CHK Note A ' || stamp then report := array_append(report, ('PASS  A2  an umpire assigned to the game can add a note, recorded under their name')::text); else report := array_append(report, ('FAIL  A2  the umpire''s note was not saved')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  A2  the umpire''s note was not saved: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- A3
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_game_note(g1, E'   spaces around   \n');
    reset role;
    if exists (select 1 from public.game_notes where game_id = g1 and body = 'spaces around') then report := array_append(report, ('PASS  A3  a note is tidied up (spaces around it are removed)')::text); else report := array_append(report, ('FAIL  A3  the note was not trimmed')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  A3  the note was not trimmed: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- A4
  begin
    perform set_config('request.jwt.claim.sub', b_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', b_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_game_note(g1, 'I am not on this game');
    reset role;
    report := array_append(report, ('FAIL  A4  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the umpires on a game%' then report := array_append(report, ('PASS  A4  an umpire who is NOT on the game cannot add a note to it')::text); else report := array_append(report, ('FAIL  A4  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- A5
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_game_note(g1, 'I am nobody');
    reset role;
    report := array_append(report, ('FAIL  A5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the umpires on a game%' then report := array_append(report, ('PASS  A5  an ordinary account (no umpire record) cannot add a note')::text); else report := array_append(report, ('FAIL  A5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- A6
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.add_game_note(g1, 'signed out');
    reset role;
    report := array_append(report, ('FAIL  A6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  A6  a signed-out visitor cannot add a note')::text); else report := array_append(report, ('FAIL  A6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- A7
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_game_note(g1, '   ');
    reset role;
    report := array_append(report, ('FAIL  A7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%cannot be empty%' then report := array_append(report, ('PASS  A7  an empty note (only spaces) is refused')::text); else report := array_append(report, ('FAIL  A7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- A8
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_game_note(g1, repeat('x', 1001));
    reset role;
    report := array_append(report, ('FAIL  A8  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%at most 1000%' then report := array_append(report, ('PASS  A8  a note of 1001 characters is refused')::text); else report := array_append(report, ('FAIL  A8  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- A9
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_game_note(g1, repeat('y', 1000));
    reset role;
    if exists (select 1 from public.game_notes where game_id = g1 and char_length(body) = 1000) then report := array_append(report, ('PASS  A9  a note of exactly 1000 characters is accepted')::text); else report := array_append(report, ('FAIL  A9  a 1000 character note was refused')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  A9  a 1000 character note was refused: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- A10
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_game_note(gen_random_uuid(), 'no such game');
    reset role;
    report := array_append(report, ('FAIL  A10  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%does not exist%' then report := array_append(report, ('PASS  A10  a note on a game that does not exist is refused')::text); else report := array_append(report, ('FAIL  A10  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- A11
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_game_note(g_cancel, 'Rained out. Make-up not scheduled yet.');
    reset role;
    if (select count(*) from public.game_notes where game_id = g_cancel) = 1 then report := array_append(report, ('PASS  A11  a note can be added to a canceled game (for example, to say why)')::text); else report := array_append(report, ('FAIL  A11  a canceled game could not have a note')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  A11  a canceled game could not have a note: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- (setup, not a test: a game that already has 99 notes)
  reset role;
  insert into public.game_notes (game_id, author_name, body) select g_many, 'Setup', 'note ' || i from generate_series(1, 99) as i;

  -- A12
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_game_note(g_many, 'the 100th');
    reset role;
    if (select count(*) from public.game_notes where game_id = g_many) = 100 then report := array_append(report, ('PASS  A12  the 100th note on a game is accepted')::text); else report := array_append(report, ('FAIL  A12  the 100th note was refused')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  A12  the 100th note was refused: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- A13
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_game_note(g_many, 'the 101st');
    reset role;
    report := array_append(report, ('FAIL  A13  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%most notes allowed%' then report := array_append(report, ('PASS  A13  ...and the 101st is refused')::text); else report := array_append(report, ('FAIL  A13  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- Who can read notes
  ----------------------------------------------------------------
  -- R1
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.game_notes where game_id = g1;
    reset role;
    if n = (select count(*) from public.game_notes where game_id = g1) then report := array_append(report, ('PASS  R1  an umpire on a game reads ALL the notes on it (including the administrator''s)')::text); else report := array_append(report, ('FAIL  R1  the umpire could not read the notes')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R1  the umpire could not read the notes: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R2
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.game_notes where game_id in (g_cancel);
    reset role;
    if n = 0 then report := array_append(report, ('PASS  R2  ...but not the notes on a game they are not on')::text); else report := array_append(report, ('FAIL  R2  an umpire read notes on someone else''s game')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R2  an umpire read notes on someone else''s game: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R3
  begin
    perform set_config('request.jwt.claim.sub', b_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', b_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.game_notes where game_id in (g1, g_many, g_cancel);
    reset role;
    if n = 0 then report := array_append(report, ('PASS  R3  another umpire sees none of them')::text); else report := array_append(report, ('FAIL  R3  an umpire read notes on a game they are not on')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R3  an umpire read notes on a game they are not on: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R4
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.game_notes;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  R4  an ordinary account sees no notes')::text); else report := array_append(report, ('FAIL  R4  an ordinary account read notes')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R4  an ordinary account read notes: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R5
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.game_notes where game_id in (g1, g_cancel, g_many);
    reset role;
    if n >= 100 then report := array_append(report, ('PASS  R5  an administrator reads every note')::text); else report := array_append(report, ('FAIL  R5  the administrator could not read the notes')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R5  the administrator could not read the notes: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- Nobody writes the table directly; only administrators remove notes
  ----------------------------------------------------------------
  -- W1
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.game_notes (game_id, author_name, body) values (g1, 'x', 'sneaky');
    reset role;
    report := array_append(report, ('FAIL  W1  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W1  an umpire cannot insert a note directly into the table')::text); else report := array_append(report, ('FAIL  W1  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W2
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.game_notes (game_id, author_name, body) values (g1, 'x', 'sneaky');
    reset role;
    report := array_append(report, ('FAIL  W2  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W2  not even an administrator can (notes go through add_game_note)')::text); else report := array_append(report, ('FAIL  W2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W3
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.game_notes set body = 'edited' where game_id = g1;
    reset role;
    report := array_append(report, ('FAIL  W3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W3  nobody can edit a note')::text); else report := array_append(report, ('FAIL  W3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W4
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    delete from public.game_notes where game_id = g1;
    reset role;
    report := array_append(report, ('FAIL  W4  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W4  nobody can delete notes directly either')::text); else report := array_append(report, ('FAIL  W4  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- (setup, not a test: remember two notes)
  reset role;
  select id into note_a from public.game_notes where game_id = g1 and body like 'Field is soft%';
  select id into note_admin from public.game_notes where game_id = g1 and body = 'Gate code is 1234';

  -- D1
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.delete_game_note(note_a);
    reset role;
    report := array_append(report, ('FAIL  D1  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only scheduling administrators%' then report := array_append(report, ('PASS  D1  an umpire cannot remove a note, not even their own')::text); else report := array_append(report, ('FAIL  D1  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- D2
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.delete_game_note(note_admin);
    reset role;
    report := array_append(report, ('FAIL  D2  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only scheduling administrators%' then report := array_append(report, ('PASS  D2  an ordinary account cannot remove a note')::text); else report := array_append(report, ('FAIL  D2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- D3
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.delete_game_note(note_admin);
    reset role;
    report := array_append(report, ('FAIL  D3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  D3  a signed-out visitor cannot remove a note')::text); else report := array_append(report, ('FAIL  D3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- D4
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.delete_game_note(note_a);
    reset role;
    if not exists (select 1 from public.game_notes where id = note_a) and exists (select 1 from public.game_notes where id = note_admin) then report := array_append(report, ('PASS  D4  an administrator can remove a note (and only that one)')::text); else report := array_append(report, ('FAIL  D4  the note was not removed')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  D4  the note was not removed: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- D5
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.delete_game_note(note_a);
    reset role;
    report := array_append(report, ('FAIL  D5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%does not exist%' then report := array_append(report, ('PASS  D5  removing a note that is already gone says so')::text); else report := array_append(report, ('FAIL  D5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- The demo clock's pretend time
  ----------------------------------------------------------------
  -- (setup, not a test: remember the setting, then switch the demo clock OFF)
  reset role;
  select value into orig_setting from public.app_settings where key = 'demo_clock_allowed';
  update public.app_settings set value = 'false' where key = 'demo_clock_allowed';
  at1 := now() + interval '30 days';

  -- C1
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_game_note(g2, 'with the demo clock off', p_now := at1);
    reset role;
    if (select created_at from public.game_notes where game_id = g2 and body = 'with the demo clock off') = now() then report := array_append(report, ('PASS  C1  with the demo clock off, a pretend time is ignored (the note is stamped with the real time)')::text); else report := array_append(report, ('FAIL  C1  a pretend time was used with the demo clock off')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C1  a pretend time was used with the demo clock off: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- (setup, not a test: switch the demo clock ON)
  reset role;
  update public.app_settings set value = 'true' where key = 'demo_clock_allowed';

  -- C2
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_game_note(g2, 'with the demo clock on', p_now := at1);
    reset role;
    if (select created_at from public.game_notes where game_id = g2 and body = 'with the demo clock on') = at1 then report := array_append(report, ('PASS  C2  with the demo clock on, the note is stamped with the pretend time')::text); else report := array_append(report, ('FAIL  C2  the pretend time was not used')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C2  the pretend time was not used: ' || sqlerrm)::text); failures := failures + 1;
  end;


  -- Always end with an error so that nothing can be saved.
  raise exception E'\n\nGAME NOTES CHECK (nothing was saved; your real data was not changed)\n\n%\n\nFailures: %\n',
    array_to_string(report, E'\n'), failures;
end
$$;
