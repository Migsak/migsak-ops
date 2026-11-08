/** Row shapes for the tables in supabase/migrations. Keep in sync with the SQL. */

export type AppRole = 'admin' | 'member';
export type MemberType = 'employee' | 'intern';
export type MemberStatus = 'active' | 'inactive';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export const TASK_STATUSES: readonly TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];
export const TASK_PRIORITIES: readonly TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  review: 'In review',
  done: 'Done'
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent'
};

export interface Team {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  app_role: AppRole;
  member_type: MemberType;
  status: MemberStatus;
  job_title: string | null;
  team_id: string | null;
  phone: string | null;
  location: string | null;
  college: string | null;
  github_username: string | null;
  start_date: string | null;
  end_date: string | null;
  shift_start: string | null;
  shift_end: string | null;
  weekday_target_minutes: number;
  weekend_target_minutes: number;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
}

export interface AttendanceSession {
  id: string;
  user_id: string;
  check_in: string;
  check_out: string | null;
  note: string | null;
  created_at: string;
}

export interface DailyUpdate {
  id: string;
  user_id: string;
  work_date: string;
  done: string;
  next_steps: string | null;
  blockers: string | null;
  links: string[];
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  team_id: string | null;
  created_by: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  submission_url: string | null;
  submission_note: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
}

export interface TrackedRepo {
  id: string;
  full_name: string;
  active: boolean;
  last_synced_at: string | null;
  last_sync_error: string | null;
  created_at: string;
}

export interface Commit {
  repo: string;
  sha: string;
  user_id: string | null;
  author_login: string | null;
  author_name: string | null;
  author_email: string | null;
  message: string;
  url: string;
  committed_at: string;
  created_at: string;
}

/** Fields that metrics need from a profile. */
export type TargetProfile = Pick<Profile, 'weekday_target_minutes' | 'weekend_target_minutes' | 'start_date' | 'end_date'>;
