'use server';

import { randomInt } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { relinkCommitsForUser, syncTrackedRepos } from '@/lib/github-sync';
import { createLogger } from '@/lib/logger';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { describeDbError, failure, success, type ActionState } from '@/lib/action-state';
import { fieldErrors, personSchema, repoSchema, taskSchema, teamSchema, type PersonInput } from '@/lib/validation';

/** Admin-only actions. Every entry point calls requireAdmin() first. */

const log = createLogger('admin-actions');

/** Readable temporary password, for example "Ops-K7mQ-4tXw-92". Avoids look-alike characters. */
function temporaryPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const chunk = (n: number) => Array.from({ length: n }, () => alphabet[randomInt(alphabet.length)]).join('');
  return `Ops-${chunk(4)}-${chunk(4)}-${randomInt(10, 100)}`;
}

function profileColumns(input: PersonInput) {
  return {
    full_name: input.full_name,
    email: input.email,
    app_role: input.app_role,
    member_type: input.member_type,
    status: input.status,
    job_title: input.job_title,
    team_id: input.team_id,
    phone: input.phone,
    location: input.location,
    college: input.college,
    github_username: input.github_username,
    start_date: input.start_date,
    end_date: input.end_date,
    shift_start: input.shift_start,
    shift_end: input.shift_end,
    weekday_target_minutes: input.weekday_target_hours,
    weekend_target_minutes: input.weekend_target_hours
  };
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export async function createPerson(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = personSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure('Check the highlighted fields.', fieldErrors(parsed.error));

  const admin = getSupabaseAdmin();
  const password = temporaryPassword();
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name }
  });
  if (authError || !created.user) {
    const exists = authError?.message.toLowerCase().includes('already');
    log.warn('create user failed', () => ({ err: authError?.message }));
    return failure(exists ? 'A user with this email already exists.' : 'Could not create the login. Please try again.', exists ? { email: 'Already in use.' } : undefined);
  }

  const { error: profileError } = await admin
    .from('profiles')
    .insert({ id: created.user.id, ...profileColumns(parsed.data), must_change_password: true });
  if (profileError) {
    // Roll back the login so the email can be used again.
    await admin.auth.admin.deleteUser(created.user.id);
    log.error('create profile failed', () => ({ err: profileError.message }));
    return failure(
      profileError.code === '23505' ? 'That GitHub username is already linked to someone else.' : describeDbError(profileError),
      profileError.code === '23505' ? { github_username: 'Already linked to another person.' } : undefined
    );
  }

  if (parsed.data.notes) await admin.from('person_notes').upsert({ user_id: created.user.id, notes: parsed.data.notes });
  if (parsed.data.github_username) await relinkCommitsForUser(created.user.id, parsed.data.github_username);
  log.info('person created', () => ({ userId: created.user.id, role: parsed.data.app_role }));
  revalidatePath('/admin', 'layout');
  return success(`${parsed.data.full_name} has been added.`, {
    personId: created.user.id,
    email: parsed.data.email,
    password
  });
}

export async function updatePerson(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const parsed = personSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure('Check the highlighted fields.', fieldErrors(parsed.error));

  if (id === viewer.userId && (parsed.data.app_role !== 'admin' || parsed.data.status !== 'active')) {
    return failure('You cannot remove your own admin access or deactivate yourself.');
  }

  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase.from('profiles').select('email, github_username').eq('id', id).maybeSingle();
  if (!before) return failure('That person no longer exists.');

  const admin = getSupabaseAdmin();
  if (before.email !== parsed.data.email) {
    const { error } = await admin.auth.admin.updateUserById(id, { email: parsed.data.email, email_confirm: true });
    if (error) {
      const exists = error.message.toLowerCase().includes('already');
      return failure(exists ? 'Another user already has that email.' : 'Could not update the login email.', exists ? { email: 'Already in use.' } : undefined);
    }
  }

  const { error } = await supabase.from('profiles').update(profileColumns(parsed.data)).eq('id', id);
  if (error) {
    log.error('update profile failed', () => ({ id, err: error.message }));
    return failure(
      error.code === '23505' ? 'That GitHub username is already linked to someone else.' : describeDbError(error),
      error.code === '23505' ? { github_username: 'Already linked to another person.' } : undefined
    );
  }

  const { error: notesError } = await supabase
    .from('person_notes')
    .upsert({ user_id: id, notes: parsed.data.notes ?? '', updated_at: new Date().toISOString() });
  if (notesError) log.error('save notes failed', () => ({ id, err: notesError.message }));

  if ((before.github_username ?? null) !== parsed.data.github_username) {
    await relinkCommitsForUser(id, parsed.data.github_username);
  }
  revalidatePath('/', 'layout');
  return success('Changes saved.');
}

export async function resetPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const admin = getSupabaseAdmin();
  const password = temporaryPassword();
  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) {
    log.error('password reset failed', () => ({ id, err: error.message }));
    return failure('Could not reset the password. Please try again.');
  }
  await admin.from('profiles').update({ must_change_password: true }).eq('id', id);
  log.info('password reset', () => ({ id }));
  return success('Password reset. Share the new temporary password privately.', { password });
}

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

export async function saveTeam(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '').trim();
  const parsed = teamSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure('Check the highlighted fields.', fieldErrors(parsed.error));

  const supabase = await createSupabaseServerClient();
  const result = id
    ? await supabase.from('teams').update(parsed.data).eq('id', id)
    : await supabase.from('teams').insert(parsed.data);
  if (result.error) {
    return failure(result.error.code === '23505' ? 'A team with that name already exists.' : describeDbError(result.error));
  }
  revalidatePath('/', 'layout');
  return success(id ? 'Team updated.' : 'Team created.');
}

export async function deleteTeam(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('teams').delete().eq('id', id);
  if (error) log.error('delete team failed', () => ({ id, err: error.message }));
  revalidatePath('/', 'layout');
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export async function saveTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireAdmin();
  const id = String(formData.get('id') ?? '').trim();
  const parsed = taskSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure('Check the highlighted fields.', fieldErrors(parsed.error));

  const supabase = await createSupabaseServerClient();

  // Default the task's team to the assignee's team so teammates can see it.
  let teamId = parsed.data.team_id;
  if (!teamId && parsed.data.assignee_id) {
    const { data } = await supabase.from('profiles').select('team_id').eq('id', parsed.data.assignee_id).maybeSingle();
    teamId = data?.team_id ?? null;
  }

  const values = { ...parsed.data, team_id: teamId };
  const result = id
    ? await supabase.from('tasks').update(values).eq('id', id).select('id').single()
    : await supabase.from('tasks').insert({ ...values, created_by: viewer.userId }).select('id').single();
  if (result.error) {
    log.error('save task failed', () => ({ err: result.error.message }));
    return failure(describeDbError(result.error));
  }
  revalidatePath('/', 'layout');
  if (!id) redirect(`/tasks/${result.data.id}`);
  return success('Task updated.');
}

export async function setTaskStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!['todo', 'in_progress', 'review', 'done'].includes(status)) return;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('tasks').update({ status }).eq('id', id);
  if (error) log.error('set status failed', () => ({ id, err: error.message }));
  revalidatePath('/', 'layout');
}

export async function deleteTask(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) log.error('delete task failed', () => ({ id, err: error.message }));
  revalidatePath('/', 'layout');
  redirect('/admin/tasks');
}

// ---------------------------------------------------------------------------
// GitHub repositories
// ---------------------------------------------------------------------------

export async function addRepo(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = repoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure('Check the highlighted fields.', fieldErrors(parsed.error));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('tracked_repos').insert({ full_name: parsed.data.full_name });
  if (error) {
    return failure(error.code === '23505' ? 'That repository is already tracked.' : describeDbError(error));
  }
  revalidatePath('/admin/repos');
  return success(`Tracking ${parsed.data.full_name}. Run a sync to load its history.`);
}

export async function toggleRepo(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const active = formData.get('active') === 'true';
  const supabase = await createSupabaseServerClient();
  await supabase.from('tracked_repos').update({ active }).eq('id', id);
  revalidatePath('/admin/repos');
}

export async function removeRepo(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const supabase = await createSupabaseServerClient();
  await supabase.from('tracked_repos').delete().eq('id', id);
  revalidatePath('/admin/repos');
}

export async function syncReposNow(_prev: ActionState): Promise<ActionState> {
  await requireAdmin();
  try {
    const results = await syncTrackedRepos();
    revalidatePath('/', 'layout');
    if (results.length === 0) return success('No active repositories to sync.');
    const failed = results.filter((r) => r.error);
    const total = results.reduce((n, r) => n + r.fetched, 0);
    if (failed.length > 0) {
      return failure(`Synced ${results.length - failed.length} of ${results.length}. ${failed.map((f) => `${f.repo}: ${f.error}`).join(' ')}`);
    }
    return success(`Synced ${results.length} ${results.length === 1 ? 'repository' : 'repositories'}, ${total} commits checked.`);
  } catch (err) {
    log.error('manual sync failed', () => ({ err }));
    return failure('Sync failed. Check the server logs.');
  }
}
