import { NextResponse, type NextRequest } from 'next/server';
import { cronSecret } from '@/lib/env';
import { syncTrackedRepos } from '@/lib/github-sync';
import { createLogger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const log = createLogger('cron-github-sync');

/** Daily backfill in case a webhook delivery was missed. Called by Vercel Cron. */
export async function GET(request: NextRequest) {
  const secret = cronSecret();
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const results = await syncTrackedRepos();
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    log.error('cron sync failed', () => ({ err }));
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
