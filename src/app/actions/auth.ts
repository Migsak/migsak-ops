'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { failure, type ActionState } from '@/lib/action-state';
import { fieldErrors, passwordSchema } from '@/lib/validation';
import { createLogger } from '@/lib/logger';

const log = createLogger('auth');

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email.'),
  password: z.string().min(1, 'Enter your password.'),
  next: z.string().optional()
});

/** Only allow same-site relative redirects after sign-in. */
function safeNext(next: string | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/';
  return next;
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure('Check the highlighted fields.', fieldErrors(parsed.error));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password
  });
  if (error) {
    log.info('sign-in failed', () => ({ reason: error.message }));
    return failure('Incorrect email or password.');
  }
  redirect(safeNext(parsed.data.next));
}

export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failure('Check the highlighted fields.', fieldErrors(parsed.error));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    log.warn('password change failed', () => ({ reason: error.message }));
    return failure(error.message.includes('different') ? 'Choose a password different from the current one.' : 'Could not update your password. Please try again.');
  }
  const { error: flagError } = await supabase.rpc('mark_password_changed');
  if (flagError) log.error('could not clear must_change_password', () => ({ err: flagError }));
  redirect('/');
}
