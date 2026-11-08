import { z } from 'zod';
import { TASK_PRIORITIES, TASK_STATUSES } from './types';

/**
 * Form schemas shared by server actions. FormData values arrive as strings, so
 * optional fields treat '' as "not provided".
 */

const blankToNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);

const optionalText = (max: number) =>
  z.preprocess(blankToNull, z.string().trim().max(max, `Must be ${max} characters or fewer.`).nullable().optional())
    .transform((v) => v ?? null);

const optionalDate = z
  .preprocess(blankToNull, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date.').nullable().optional())
  .transform((v) => v ?? null);

const optionalTime = z
  .preprocess(blankToNull, z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Use a valid time.').nullable().optional())
  .transform((v) => v ?? null);

const optionalUuid = z
  .preprocess(blankToNull, z.string().uuid().nullable().optional())
  .transform((v) => v ?? null);

/** Accepts hours as a decimal string ("4", "3.5") and returns whole minutes. */
const hoursToMinutes = z.coerce
  .number({ invalid_type_error: 'Enter hours as a number.' })
  .min(0, 'Cannot be negative.')
  .max(24, 'Cannot exceed 24 hours.')
  .transform((h) => Math.round(h * 60));

export const normalizeUrl = (value: string): string => {
  const v = value.trim();
  if (!v) return v;
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v}`;
};

const httpUrl = z
  .string()
  .trim()
  .max(500)
  .transform(normalizeUrl)
  .refine((v) => {
    try {
      const u = new URL(v);
      return (u.protocol === 'https:' || u.protocol === 'http:') && u.hostname.includes('.');
    } catch {
      return false;
    }
  }, 'Enter a valid link.');

const optionalUrl = z.preprocess(blankToNull, httpUrl.nullable().optional()).transform((v) => v ?? null);

export const personSchema = z
  .object({
    full_name: z.string().trim().min(2, 'Name is required.').max(120),
    email: z.string().trim().toLowerCase().email('Enter a valid email.').max(254),
    app_role: z.enum(['admin', 'member']),
    member_type: z.enum(['employee', 'intern']),
    status: z.enum(['active', 'inactive']).default('active'),
    job_title: optionalText(120),
    team_id: optionalUuid,
    phone: optionalText(30),
    location: optionalText(120),
    college: optionalText(160),
    github_username: z
      .preprocess(
        blankToNull,
        z
          .string()
          .trim()
          .regex(/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/, 'Enter a GitHub username, not a link.')
          .nullable()
          .optional()
      )
      .transform((v) => v ?? null),
    start_date: optionalDate,
    end_date: optionalDate,
    shift_start: optionalTime,
    shift_end: optionalTime,
    weekday_target_hours: hoursToMinutes,
    weekend_target_hours: hoursToMinutes,
    notes: optionalText(4000)
  })
  .refine((v) => !v.start_date || !v.end_date || v.end_date >= v.start_date, {
    message: 'End date must be on or after the start date.',
    path: ['end_date']
  });
export type PersonInput = z.infer<typeof personSchema>;

export const teamSchema = z.object({
  name: z.string().trim().min(2, 'Team name is required.').max(80),
  description: optionalText(500)
});

export const taskSchema = z.object({
  title: z.string().trim().min(3, 'Title needs at least 3 characters.').max(200),
  description: optionalText(8000),
  assignee_id: optionalUuid,
  team_id: optionalUuid,
  priority: z.enum(TASK_PRIORITIES as [string, ...string[]]),
  status: z.enum(TASK_STATUSES as [string, ...string[]]).default('todo'),
  due_date: optionalDate
});

export const memberTaskUpdateSchema = z.object({
  task_id: z.string().uuid(),
  status: z.enum(['todo', 'in_progress', 'review']),
  submission_url: optionalUrl,
  submission_note: optionalText(2000)
});

export const commentSchema = z.object({
  task_id: z.string().uuid(),
  body: z.string().trim().min(1, 'Write a comment first.').max(4000)
});

export const dailyUpdateSchema = z.object({
  done: z.string().trim().min(10, 'Describe what you worked on (at least 10 characters).').max(4000),
  next_steps: optionalText(2000),
  blockers: optionalText(2000),
  links: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? '')
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    )
    .pipe(z.array(httpUrl).max(10, 'Add up to 10 links.'))
});

export const passwordSchema = z
  .object({
    password: z
      .string()
      .min(10, 'Use at least 10 characters.')
      .max(72)
      .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'Use letters and at least one number.'),
    confirm: z.string()
  })
  .refine((v) => v.password === v.confirm, { message: 'Passwords do not match.', path: ['confirm'] });

export const repoSchema = z.object({
  full_name: z
    .string()
    .trim()
    .transform((v) => v.replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '').replace(/\/+$/, ''))
    .pipe(z.string().regex(/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/, 'Use the owner/repository format, for example mystifoe/migsak.'))
});

/** Flattens zod issues into a field -> first message map for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
