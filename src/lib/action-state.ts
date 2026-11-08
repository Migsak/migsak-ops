/** Result shape returned by every form server action. */
export interface ActionState {
  ok: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Optional payload, for example a one-time password to show the admin. */
  data?: Record<string, string>;
}

export const initialActionState: ActionState = { ok: false };

export function failure(error: string, fieldErrors?: Record<string, string>): ActionState {
  return { ok: false, error, fieldErrors };
}

export function success(message?: string, data?: Record<string, string>): ActionState {
  return { ok: true, message, data };
}

/** Maps Postgres / PostgREST errors raised by our SQL functions to user-facing text. */
export function describeDbError(err: { message?: string; code?: string } | null | undefined): string {
  const msg = err?.message ?? '';
  const known: Record<string, string> = {
    already_checked_in: 'You are already checked in.',
    not_checked_in: 'You are not checked in.',
    inactive_member: 'Your account is inactive.',
    only_admin_can_complete: 'Only an admin can mark a task as done. Move it to review instead.',
    not_allowed: 'You do not have permission to do that.',
    task_not_found: 'That task no longer exists.',
    invalid_submission_url: 'Enter a valid link for your submission.'
  };
  for (const [key, text] of Object.entries(known)) {
    if (msg.includes(key)) return text;
  }
  if (err?.code === '23505') return 'That already exists.';
  if (err?.code === '42501') return 'You do not have permission to do that.';
  return 'Something went wrong. Please try again.';
}
