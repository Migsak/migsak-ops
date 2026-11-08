'use server';

import { revalidatePath } from 'next/cache';
import { requireViewer } from '@/lib/auth';
import { appTimezone } from '@/lib/env';
import { createLogger } from '@/lib/logger';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { todayKey } from '@/lib/time';
import { commentSchema, dailyUpdateSchema, fieldErrors, memberTaskUpdateSchema } from '@/lib/validation';
import { describeDbError, failure, success, type ActionState } from '@/lib/action-state';

/** Actions any signed-in member can take on their own work. */

const log = createLogger('work-actions');

function noteFrom(formData: FormData): string | null {
  const note = String(formData.get('note') ?? '').trim();
  return note ? note.slice(0, 500) : null;
}

export async function checkIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireViewer();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('check_in', { p_note: noteFrom(formData) });
  if (error) {
    log.warn('check-in failed', () => ({ err: error.message }));
    return failure(describeDbError(error));
  }
  revalidatePath('/', 'layout');
  return success('Checked in.');
}

export async function checkOut(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireViewer();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('check_out', { p_note: noteFrom(formData) });
  if (error) {
    log.warn('check-out failed', () => ({ err: error.message }));
    return failure(describeDbError(error));
  }
  revalidatePath('/', 'layout');
  return success('Checked out.');
}

export async function saveDailyUpdate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireViewer();
  const parsed = dailyUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure('Check the highlighted fields.', fieldErrors(parsed.error));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('daily_updates').upsert(
    {
      user_id: viewer.userId,
      work_date: todayKey(appTimezone()),
      done: parsed.data.done,
      next_steps: parsed.data.next_steps,
      blockers: parsed.data.blockers,
      links: parsed.data.links
    },
    { onConflict: 'user_id,work_date' }
  );
  if (error) {
    log.error('daily update failed', () => ({ err: error.message }));
    return failure(describeDbError(error));
  }
  revalidatePath('/', 'layout');
  return success("Today's update is saved.");
}

export async function updateMyTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireViewer();
  const parsed = memberTaskUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure('Check the highlighted fields.', fieldErrors(parsed.error));
  if (parsed.data.status === 'review' && !parsed.data.submission_url) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from('tasks').select('submission_url').eq('id', parsed.data.task_id).maybeSingle();
    if (!data?.submission_url) {
      return failure('Add a link to your work before sending it for review.', { submission_url: 'Required for review.' });
    }
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('member_update_task', {
    p_task_id: parsed.data.task_id,
    p_status: parsed.data.status,
    p_submission_url: parsed.data.submission_url,
    p_submission_note: parsed.data.submission_note
  });
  if (error) {
    log.warn('task update failed', () => ({ err: error.message }));
    return failure(describeDbError(error));
  }
  revalidatePath('/', 'layout');
  return success(parsed.data.status === 'review' ? 'Sent for review.' : 'Task updated.');
}

export async function addComment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireViewer();
  const parsed = commentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure('Check the highlighted fields.', fieldErrors(parsed.error));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('task_comments').insert({
    task_id: parsed.data.task_id,
    author_id: viewer.userId,
    body: parsed.data.body
  });
  if (error) {
    log.warn('comment failed', () => ({ err: error.message }));
    return failure(describeDbError(error));
  }
  revalidatePath(`/tasks/${parsed.data.task_id}`);
  return success();
}
