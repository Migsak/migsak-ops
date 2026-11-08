'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

/**
 * Subscribes to Supabase Realtime changes on the given tables and refreshes the
 * server-rendered page when anything changes. Row level security still applies,
 * so people only receive events for rows they can see. Also refreshes on an
 * interval as a fallback, and whenever the tab becomes visible again.
 */
export function LiveRefresh({ tables, intervalMs = 60_000 }: { tables: string[]; intervalMs?: number }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connected, setConnected] = useState(false);
  const key = tables.join(',');

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const refresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 400);
    };

    let channel = supabase.channel(`live:${key}:${Math.random().toString(36).slice(2)}`);
    for (const table of key.split(',')) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, refresh);
    }
    channel.subscribe((status) => setConnected(status === 'SUBSCRIBED'));

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') router.refresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      if (timer.current) clearTimeout(timer.current);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      void supabase.removeChannel(channel);
    };
  }, [key, intervalMs, router]);

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted" aria-live="polite">
      <span className={connected ? 'h-2 w-2 rounded-full bg-emerald-500' : 'h-2 w-2 rounded-full bg-gray-300'} aria-hidden="true" />
      {connected ? 'Live' : 'Connecting'}
    </span>
  );
}
