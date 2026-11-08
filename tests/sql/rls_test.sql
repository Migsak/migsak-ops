-- Row level security and member-action tests. Run after the stub and migration.
-- Every check raises an exception on failure, so ON_ERROR_STOP surfaces it.
\set ON_ERROR_STOP 1

grant select, insert, update, delete on all tables in schema public to authenticated;

insert into auth.users values
  ('00000000-0000-0000-0000-00000000000a', 'admin@test.dev'),
  ('00000000-0000-0000-0000-00000000000b', 'alice@test.dev'),
  ('00000000-0000-0000-0000-00000000000c', 'bob@test.dev'),
  ('00000000-0000-0000-0000-00000000000d', 'carol@test.dev');

insert into teams (id, name) values ('10000000-0000-0000-0000-000000000001', 'Developers');

insert into profiles (id, email, full_name, app_role, team_id, github_username) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@test.dev', 'Admin User', 'admin', null, null),
  ('00000000-0000-0000-0000-00000000000b', 'alice@test.dev', 'Alice Dev', 'member', '10000000-0000-0000-0000-000000000001', 'alice-dev'),
  ('00000000-0000-0000-0000-00000000000c', 'bob@test.dev', 'Bob Dev', 'member', '10000000-0000-0000-0000-000000000001', 'bob-dev'),
  ('00000000-0000-0000-0000-00000000000d', 'carol@test.dev', 'Carol Solo', 'member', null, 'carol');

insert into commits (repo, sha, user_id, author_login, message, url, committed_at) values
  ('o/r', repeat('a', 40), '00000000-0000-0000-0000-00000000000b', 'alice-dev', 'feat', 'https://github.com/o/r/commit/a', now());

create or replace function pg_temp.act_as(uid text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid, false);
$$;

set role authenticated;

-- Alice (team member)
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
do $$ begin
  if (select count(*) from profiles) <> 2 then raise exception 'alice should see herself and bob only, saw %', (select count(*) from profiles); end if;
  if (select count(*) from commits) <> 1 then raise exception 'alice should see her commit'; end if;
end $$;

select check_in('starting');
do $$ begin
  begin
    perform check_in(null);
    raise exception 'double check-in should fail';
  exception when unique_violation then null; end;
end $$;
select check_out(null);
do $$ begin
  if (select count(*) from attendance_sessions where check_out is not null) <> 1 then raise exception 'check-out did not close session'; end if;
end $$;

-- Members cannot create tasks or edit their own profile directly.
do $$ begin
  begin
    insert into tasks (title) values ('sneaky task');
    raise exception 'member insert into tasks should fail';
  exception when insufficient_privilege then null; end;
end $$;
do $$ declare n int; begin
  update profiles set app_role = 'admin' where id = auth.uid();
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'member must not update own profile'; end if;
end $$;

insert into daily_updates (user_id, work_date, done) values (auth.uid(), current_date, 'Built the login page today');

-- Carol (no team)
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
do $$ begin
  if (select count(*) from profiles) <> 1 then raise exception 'carol should only see herself'; end if;
  if (select count(*) from commits) <> 0 then raise exception 'carol must not see alice commits'; end if;
  if (select count(*) from daily_updates) <> 0 then raise exception 'carol must not see alice updates'; end if;
  if (select count(*) from attendance_sessions) <> 0 then raise exception 'carol must not see alice attendance'; end if;
end $$;
do $$ begin
  begin
    insert into daily_updates (user_id, work_date, done) values ('00000000-0000-0000-0000-00000000000b', current_date - 1, 'Writing for someone else');
    raise exception 'writing another member update should fail';
  exception when insufficient_privilege then null; end;
end $$;

-- Admin creates and assigns a task.
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
insert into tasks (id, title, assignee_id, team_id, created_by)
values ('20000000-0000-0000-0000-000000000001', 'Build attendance page', '00000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000001', auth.uid());
do $$ begin
  if (select count(*) from profiles) <> 4 then raise exception 'admin should see everyone'; end if;
end $$;

insert into person_notes (user_id, notes) values ('00000000-0000-0000-0000-00000000000b', 'Strong on backend');

-- Alice moves her task to review, but cannot mark it done.
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select status from member_update_task('20000000-0000-0000-0000-000000000001', 'review', 'https://github.com/o/r/pull/1', 'Ready');
do $$ begin
  begin
    perform member_update_task('20000000-0000-0000-0000-000000000001', 'done');
    raise exception 'member should not complete task';
  exception when insufficient_privilege then null; end;
end $$;
insert into task_comments (task_id, author_id, body) values ('20000000-0000-0000-0000-000000000001', auth.uid(), 'PR is up');
do $$ begin
  if (select count(*) from person_notes) <> 0 then raise exception 'members must never see admin notes about them'; end if;
end $$;

-- Bob (same team) can see the team task; Carol cannot.
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
do $$ begin
  if (select count(*) from tasks) <> 1 then raise exception 'bob should see team task'; end if;
  begin
    perform member_update_task('20000000-0000-0000-0000-000000000001', 'in_progress');
    raise exception 'bob should not update a task assigned to alice';
  exception when insufficient_privilege then null; end;
end $$;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
do $$ begin
  if (select count(*) from tasks) <> 0 then raise exception 'carol must not see team task'; end if;
  if (select count(*) from task_comments) <> 0 then raise exception 'carol must not see comments'; end if;
end $$;

-- Admin completes the task; completed_at is set by trigger.
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
update tasks set status = 'done' where id = '20000000-0000-0000-0000-000000000001';
do $$ begin
  if (select completed_at from tasks where id = '20000000-0000-0000-0000-000000000001') is null then raise exception 'completed_at not set'; end if;
end $$;

-- Inactive members cannot check in.
reset role;
update profiles set status = 'inactive' where id = '00000000-0000-0000-0000-00000000000d';
set role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
do $$ begin
  begin
    perform check_in(null);
    raise exception 'inactive member should not check in';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
select 'ALL RLS TESTS PASSED' as result;
