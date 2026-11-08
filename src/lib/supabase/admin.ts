import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { publicEnv, serviceRoleKey } from '@/lib/env';

let client: SupabaseClient | null = null;

/**
 * Service-role client. Bypasses row level security, so only use it in code
 * that has already checked the caller is an admin, or in trusted server jobs
 * (GitHub webhook and sync).
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!client) {
    const { supabaseUrl } = publicEnv();
    client = createClient(supabaseUrl, serviceRoleKey(), {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return client;
}
