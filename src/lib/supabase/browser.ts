'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/** Singleton browser client, used for realtime subscriptions. */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, '') ?? '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
    client = createBrowserClient(url, key);
  }
  return client;
}
