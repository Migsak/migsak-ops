-- Migsak Ops: core schema
-- People, teams, attendance, daily updates, tasks, comments and GitHub activity.
-- Row level security is enabled on every table. Members see their own data and
-- their team's data; admins see everything. Writes that need column-level rules
-- go through SECURITY DEFINER functions with explicit checks.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
do $$ begin
  create type app_role as enum ('admin', 'member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type member_type as enum ('employee', 'intern');
exception when duplicate_object then null; end $$;

do $$ begin
  create type member_status as enum ('active', 'inactive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_status as enum ('todo', 'in_progress', 'review', 'done');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_priority as enum ('low', 'medium', 'high', 'urgent');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 80),
  description text check (char_length(description) <= 500),
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null check (char_length(full_name) between 2 and 120),
  app_role app_role not null default 'member',
  member_type member_type not null default 'intern',
  status member_status not null default 'active',
  job_title text check (char_length(job_title) <= 120),
  team_id uuid references teams (id) on delete set null,
  phone text check (char_length(phone) <= 30),
  location text check (char_length(location) <= 120),
  college text check (char_length(college) <= 160),
  github_username text check (github_username ~ '^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$'),
  start_date date,
  end_date date,
  shift_start time,
  shift_end time,
  weekday_target_minutes integer not null default 240 check (weekday_target_minutes between 0 and 1440),
  weekend_target_minutes integer not null default 240 check (weekend_target_minutes between 0 and 1440),
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_dates_valid check (end_date is null or start_date is null or end_date >= start_date)
);

create unique index if not exists profiles_github_username_key
  on profiles (lower(github_username)) where github_username is not null;
create index if not exists profiles_team_idx on profiles (team_id);

-- Admin-only notes about a person, kept out of profiles so members never see them.
create table if not exists person_notes (
  user_id uuid primary key references profiles (id) on delete cascade,
  notes text not null default '' check (char_length(notes) <= 4000),
  updated_at timestamptz not null default now()
);

create table if not exists attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  check_in timestamptz not null default now(),
  check_out timestamptz,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  constraint attendance_order_valid check (check_out is null or check_out > check_in),
  constraint attendance_length_valid check (check_out is null or check_out - check_in <= interval '16 hours')
);

-- At most one open session per person.
create unique index if not exists attendance_one_open_session
  on attendance_sessions (user_id) where check_out is null;
create index if not exists attendance_user_time_idx on attendance_sessions (user_id, check_in desc);

create table if not exists daily_updates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  work_date date not null,
  done text not null check (char_length(done) between 10 and 4000),
  next_steps text check (char_length(next_steps) <= 2000),
  blockers text check (char_length(blockers) <= 2000),
  links text[] not null default '{}' check (cardinality(links) <= 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, work_date)
);
create index if not exists daily_updates_date_idx on daily_updates (work_date desc);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 200),
  description text check (char_length(description) <= 8000),
  assignee_id uuid references profiles (id) on delete set null,
  team_id uuid references teams (id) on delete set null,
  created_by uuid references profiles (id) on delete set null,
  status task_status not null default 'todo',
  priority task_priority not null default 'medium',
  due_date date,
  submission_url text check (submission_url is null or submission_url ~* '^https?://'),
  submission_note text check (char_length(submission_note) <= 2000),
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_assignee_idx on tasks (assignee_id, status);
create index if not exists tasks_team_idx on tasks (team_id, status);

create table if not exists task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks (id) on delete cascade,
  author_id uuid references profiles (id) on delete set null,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists task_comments_task_idx on task_comments (task_id, created_at);

create table if not exists tracked_repos (
  id uuid primary key default gen_random_uuid(),
  full_name text not null unique check (full_name ~ '^[A-Za-z0-9-]+/[A-Za-z0-9._-]+$'),
  active boolean not null default true,
  last_synced_at timestamptz,
  last_sync_error text,
  created_at timestamptz not null default now()
);

create table if not exists commits (
  repo text not null,
  sha text not null check (sha ~ '^[0-9a-f]{40}$'),
  user_id uuid references profiles (id) on delete set null,
  author_login text,
  author_name text,
  author_email text,
  message text not null default '',
  url text not null,
  committed_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (repo, sha)
);
create index if not exists commits_user_time_idx on commits (user_id, committed_at desc);
create index if not exists commits_time_idx on commits (committed_at desc);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_touch on profiles;
create trigger profiles_touch before update on profiles for each row execute function touch_updated_at();
drop trigger if exists daily_updates_touch on daily_updates;
create trigger daily_updates_touch before update on daily_updates for each row execute function touch_updated_at();
drop trigger if exists tasks_touch on tasks;
create trigger tasks_touch before update on tasks for each row execute function touch_updated_at();

-- Keep completed_at in step with status regardless of who changes it.
create or replace function tasks_track_completion() returns trigger
language plpgsql as $$
begin
  if new.status = 'done' and (old.status is distinct from 'done') then
    new.completed_at := now();
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;
  return new;
end $$;

drop trigger if exists tasks_completion on tasks;
create trigger tasks_completion before update on tasks for each row execute function tasks_track_completion();

-- ---------------------------------------------------------------------------
-- Helper functions used by policies
-- ---------------------------------------------------------------------------
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and app_role = 'admin' and status = 'active'
  );
$$;

create or replace function my_team_id() returns uuid
language sql stable security definer set search_path = public as $$
  select team_id from profiles where id = auth.uid();
$$;

-- True when the given person is the caller or shares the caller's team.
create or replace function can_see_member(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select target = auth.uid()
    or is_admin()
    or exists (
      select 1 from profiles p
      where p.id = target
        and p.team_id is not null
        and p.team_id = my_team_id()
    );
$$;

create or replace function can_see_task(t tasks) returns boolean
language sql stable security definer set search_path = public as $$
  select is_admin()
    or t.assignee_id = auth.uid()
    or (t.team_id is not null and t.team_id = my_team_id());
$$;

revoke all on function is_admin() from public;
revoke all on function my_team_id() from public;
revoke all on function can_see_member(uuid) from public;
revoke all on function can_see_task(tasks) from public;
grant execute on function is_admin() to authenticated;
grant execute on function my_team_id() to authenticated;
grant execute on function can_see_member(uuid) to authenticated;
grant execute on function can_see_task(tasks) to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table teams enable row level security;
alter table profiles enable row level security;
alter table attendance_sessions enable row level security;
alter table daily_updates enable row level security;
alter table tasks enable row level security;
alter table task_comments enable row level security;
alter table tracked_repos enable row level security;
alter table person_notes enable row level security;
alter table commits enable row level security;

-- Teams: everyone signed in can read team names; only admins change them.
drop policy if exists teams_select on teams;
create policy teams_select on teams for select to authenticated using (true);
drop policy if exists teams_admin_write on teams;
create policy teams_admin_write on teams for all to authenticated using (is_admin()) with check (is_admin());

-- Profiles: self, teammates and admins can read. Only admins write directly.
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select to authenticated using (can_see_member(id));
drop policy if exists profiles_admin_write on profiles;
create policy profiles_admin_write on profiles for all to authenticated using (is_admin()) with check (is_admin());

-- Attendance: read self and team; members insert and close only their own sessions.
drop policy if exists attendance_select on attendance_sessions;
create policy attendance_select on attendance_sessions for select to authenticated using (can_see_member(user_id));
drop policy if exists attendance_admin_write on attendance_sessions;
create policy attendance_admin_write on attendance_sessions for all to authenticated using (is_admin()) with check (is_admin());

-- Daily updates: read self and team; write own.
drop policy if exists updates_select on daily_updates;
create policy updates_select on daily_updates for select to authenticated using (can_see_member(user_id));
drop policy if exists updates_insert_own on daily_updates;
create policy updates_insert_own on daily_updates for insert to authenticated with check (user_id = auth.uid());
drop policy if exists updates_update_own on daily_updates;
create policy updates_update_own on daily_updates for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists updates_admin_all on daily_updates;
create policy updates_admin_all on daily_updates for all to authenticated using (is_admin()) with check (is_admin());

-- Tasks: read when assigned, same team or admin. Admins write; members use member_update_task().
drop policy if exists tasks_select on tasks;
create policy tasks_select on tasks for select to authenticated using (can_see_task(tasks));
drop policy if exists tasks_admin_write on tasks;
create policy tasks_admin_write on tasks for all to authenticated using (is_admin()) with check (is_admin());

-- Comments: read and write on tasks you can see.
drop policy if exists comments_select on task_comments;
create policy comments_select on task_comments for select to authenticated
  using (exists (select 1 from tasks t where t.id = task_id and can_see_task(t)));
drop policy if exists comments_insert on task_comments;
create policy comments_insert on task_comments for insert to authenticated
  with check (author_id = auth.uid() and exists (select 1 from tasks t where t.id = task_id and can_see_task(t)));
drop policy if exists comments_admin_delete on task_comments;
create policy comments_admin_delete on task_comments for delete to authenticated using (is_admin());

-- Person notes: admins only.
drop policy if exists notes_admin on person_notes;
create policy notes_admin on person_notes for all to authenticated using (is_admin()) with check (is_admin());

-- Tracked repos: admins only.
drop policy if exists repos_admin on tracked_repos;
create policy repos_admin on tracked_repos for all to authenticated using (is_admin()) with check (is_admin());

-- Commits: read self and team. Writes come from the server with the service role.
drop policy if exists commits_select on commits;
create policy commits_select on commits for select to authenticated
  using (is_admin() or (user_id is not null and can_see_member(user_id)));

-- ---------------------------------------------------------------------------
-- Member actions (column-level rules enforced here)
-- ---------------------------------------------------------------------------
create or replace function check_in(p_note text default null) returns attendance_sessions
language plpgsql security definer set search_path = public as $$
declare
  result attendance_sessions;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not exists (select 1 from profiles where id = auth.uid() and status = 'active') then
    raise exception 'inactive_member' using errcode = '42501';
  end if;
  if exists (select 1 from attendance_sessions where user_id = auth.uid() and check_out is null) then
    raise exception 'already_checked_in' using errcode = '23505';
  end if;
  insert into attendance_sessions (user_id, note)
  values (auth.uid(), nullif(trim(p_note), ''))
  returning * into result;
  return result;
end $$;

create or replace function check_out(p_note text default null) returns attendance_sessions
language plpgsql security definer set search_path = public as $$
declare
  result attendance_sessions;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  update attendance_sessions
     set check_out = least(now(), check_in + interval '16 hours'),
         note = coalesce(nullif(trim(p_note), ''), note)
   where user_id = auth.uid() and check_out is null
  returning * into result;
  if result.id is null then
    raise exception 'not_checked_in' using errcode = 'P0002';
  end if;
  return result;
end $$;

create or replace function member_update_task(
  p_task_id uuid,
  p_status task_status,
  p_submission_url text default null,
  p_submission_note text default null
) returns tasks
language plpgsql security definer set search_path = public as $$
declare
  current_task tasks;
  result tasks;
begin
  select * into current_task from tasks where id = p_task_id;
  if current_task.id is null then
    raise exception 'task_not_found' using errcode = 'P0002';
  end if;
  if not (is_admin() or current_task.assignee_id = auth.uid()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  -- Only admins can mark a task done; members move it to review.
  if p_status = 'done' and not is_admin() then
    raise exception 'only_admin_can_complete' using errcode = '42501';
  end if;
  if p_submission_url is not null and p_submission_url !~* '^https?://' then
    raise exception 'invalid_submission_url' using errcode = '22023';
  end if;

  update tasks set
    status = p_status,
    submission_url = coalesce(nullif(trim(p_submission_url), ''), submission_url),
    submission_note = coalesce(nullif(trim(p_submission_note), ''), submission_note),
    submitted_at = case when p_status = 'review' then now() else submitted_at end
  where id = p_task_id
  returning * into result;
  return result;
end $$;

create or replace function mark_password_changed() returns void
language sql security definer set search_path = public as $$
  update profiles set must_change_password = false where id = auth.uid();
$$;

revoke all on function check_in(text) from public;
revoke all on function check_out(text) from public;
revoke all on function member_update_task(uuid, task_status, text, text) from public;
revoke all on function mark_password_changed() from public;
grant execute on function check_in(text) to authenticated;
grant execute on function check_out(text) to authenticated;
grant execute on function member_update_task(uuid, task_status, text, text) to authenticated;
grant execute on function mark_password_changed() to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: live dashboard updates
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table attendance_sessions;
    exception when duplicate_object then null; end;
    begin
      alter publication supabase_realtime add table tasks;
    exception when duplicate_object then null; end;
    begin
      alter publication supabase_realtime add table daily_updates;
    exception when duplicate_object then null; end;
    begin
      alter publication supabase_realtime add table commits;
    exception when duplicate_object then null; end;
    begin
      alter publication supabase_realtime add table task_comments;
    exception when duplicate_object then null; end;
  end if;
end $$;
