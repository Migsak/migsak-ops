import { z } from 'zod';

/**
 * Environment access with validation. Public values are read through literal
 * process.env references so Next.js can inline them into the browser bundle.
 */

export class ConfigError extends Error {
  constructor(public readonly variable: string) {
    super(`Missing or invalid environment variable: ${variable}`);
    this.name = 'ConfigError';
  }
}

const urlSchema = z.string().url();

function required(name: string, value: string | undefined): string {
  const v = value?.trim();
  if (!v) throw new ConfigError(name);
  return v;
}

/** Accepts the project URL with or without a trailing slash or a pasted /rest/v1 path. */
export function normalizeSupabaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '').replace(/\/(rest|auth)\/v1$/, '');
  if (!urlSchema.safeParse(trimmed).success) throw new ConfigError('NEXT_PUBLIC_SUPABASE_URL');
  return trimmed;
}

export function publicEnv() {
  return {
    supabaseUrl: normalizeSupabaseUrl(required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL)),
    supabaseAnonKey: required('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  };
}

export function serviceRoleKey(): string {
  return required('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
}

const DEFAULT_TZ = 'Asia/Kolkata';

export function appTimezone(): string {
  const tz = process.env.APP_TIMEZONE?.trim() || DEFAULT_TZ;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TZ;
  }
}

export function githubToken(): string | null {
  return process.env.GITHUB_TOKEN?.trim() || null;
}

export function githubWebhookSecret(): string | null {
  return process.env.GITHUB_WEBHOOK_SECRET?.trim() || null;
}

export function cronSecret(): string | null {
  return process.env.CRON_SECRET?.trim() || null;
}
