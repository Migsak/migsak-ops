import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logger';
import type { AttendanceSession, Commit, DailyUpdate, Profile, Task, TaskComment, Team, TrackedRepo } from '@/lib/types';

/**
 * Read queries. All of them run as the signed-in user, so row level security
 * decides what comes back. A failed query is logged and treated as empty, so a
 * single broken panel never takes the whole page down.
 */

const log = createLogger('queries');

async function db() {
  return createSupabaseServerClient();
}

function rows<T>(label: string, result: { data: unknown; error: { message: string } | null }): T[] {
  if (result.error) {
    log.error('query failed', () => ({ query: label, err: result.error?.message }));
    return [];
  }
  return (result.data as T[] | null) ?? [];
}

export async function listTeams(): Promise<Team[]> {
  const supabase = await db();
  return rows<Team>('teams', await supabase.from('teams').select('*').order('name'));
}

/** Everyone the viewer can see: self and teammates, or everyone for admins. */
export async function listProfiles(options: { activeOnly?: boolean } = {}): Promise<Profile[]> {
  const supabase = await db();
  let query = supabase.from('profiles').select('*').order('full_name');
  if (options.activeOnly) query = query.eq('status', 'active');
  return rows<Profile>('profiles', await query);
}

export async function getProfile(id: string): Promise<Profile | null> {
  const supabase = await db();
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle<Profile>();
  if (error) log.error('profile query failed', () => ({ id, err: error.message }));
  return data ?? null;
}

export async function listSessions(userIds: readonly string[], since: Date): Promise<AttendanceSession[]> {
  if (userIds.length === 0) return [];
  const supabase = await db();
  // Include sessions that started a little before the window but ran into it.
  const from = new Date(since.getTime() - 16 * 60 * 60 * 1000).toISOString();
  return rows<AttendanceSession>(
    'sessions',
    await supabase.from('attendance_sessions').select('*').in('user_id', [...userIds]).gte('check_in', from).order('check_in', { ascending: false })
  );
}

export async function listOpenSessions(): Promise<AttendanceSession[]> {
  const supabase = await db();
  return rows<AttendanceSession>('open-sessions', await supabase.from('attendance_sessions').select('*').is('check_out', null));
}

export async function listUpdates(userIds: readonly string[], fromKey: string, toKey: string): Promise<DailyUpdate[]> {
  if (userIds.length === 0) return [];
  const supabase = await db();
  return rows<DailyUpdate>(
    'updates',
    await supabase
      .from('daily_updates')
      .select('*')
      .in('user_id', [...userIds])
      .gte('work_date', fromKey)
      .lte('work_date', toKey)
      .order('work_date', { ascending: false })
  );
}

export async function getUpdate(userId: string, key: string): Promise<DailyUpdate | null> {
  const supabase = await db();
  const { data } = await supabase.from('daily_updates').select('*').eq('user_id', userId).eq('work_date', key).maybeSingle<DailyUpdate>();
  return data ?? null;
}

export async function listTasks(filter: { assigneeId?: string; teamId?: string; includeDone?: boolean } = {}): Promise<Task[]> {
  const supabase = await db();
  let query = supabase.from('tasks').select('*');
  if (filter.assigneeId) query = query.eq('assignee_id', filter.assigneeId);
  if (filter.teamId) query = query.eq('team_id', filter.teamId);
  if (filter.includeDone === false) query = query.neq('status', 'done');
  return rows<Task>('tasks', await query.order('due_date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false }));
}

export async function getTask(id: string): Promise<Task | null> {
  const supabase = await db();
  const { data } = await supabase.from('tasks').select('*').eq('id', id).maybeSingle<Task>();
  return data ?? null;
}

export async function listComments(taskId: string): Promise<TaskComment[]> {
  const supabase = await db();
  return rows<TaskComment>('comments', await supabase.from('task_comments').select('*').eq('task_id', taskId).order('created_at'));
}

export async function listCommits(filter: { userIds?: readonly string[]; since: Date; limit?: number }): Promise<Commit[]> {
  const supabase = await db();
  let query = supabase.from('commits').select('*').gte('committed_at', filter.since.toISOString());
  if (filter.userIds) {
    if (filter.userIds.length === 0) return [];
    query = query.in('user_id', [...filter.userIds]);
  }
  return rows<Commit>('commits', await query.order('committed_at', { ascending: false }).limit(filter.limit ?? 1000));
}

export async function listRepos(): Promise<TrackedRepo[]> {
  const supabase = await db();
  return rows<TrackedRepo>('repos', await supabase.from('tracked_repos').select('*').order('full_name'));
}
