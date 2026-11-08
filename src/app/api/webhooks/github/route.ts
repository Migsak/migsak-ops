import { NextResponse, type NextRequest } from 'next/server';
import { githubWebhookSecret } from '@/lib/env';
import { parsePushEvent, verifyWebhookSignature } from '@/lib/github';
import { saveCommits } from '@/lib/github-sync';
import { createLogger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const log = createLogger('github-webhook');
const MAX_BODY_BYTES = 2 * 1024 * 1024;

/**
 * Receives GitHub "push" webhooks (repository or organisation level) and stores
 * the commits straight away, which is what makes the dashboards live.
 */
export async function POST(request: NextRequest) {
  const secret = githubWebhookSecret();
  if (!secret) {
    log.error('GITHUB_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: 'payload_too_large' }, { status: 413 });
  if (!verifyWebhookSignature(secret, raw, request.headers.get('x-hub-signature-256'))) {
    log.warn('rejected webhook with bad signature');
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  const event = request.headers.get('x-github-event');
  if (event === 'ping') return NextResponse.json({ ok: true, pong: true });
  if (event !== 'push') return NextResponse.json({ ok: true, ignored: event });

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  try {
    const commits = parsePushEvent(payload);
    const saved = await saveCommits(commits);
    log.info('push stored', () => ({ repo: commits[0]?.repo, saved }));
    return NextResponse.json({ ok: true, saved });
  } catch (err) {
    log.error('push handling failed', () => ({ err }));
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
