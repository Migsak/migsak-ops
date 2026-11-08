import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { attachUserIds, fetchRepoCommits, parseApiCommits, parsePushEvent, verifyWebhookSignature } from '@/lib/github';

const SHA = 'a'.repeat(40);

describe('webhook signatures', () => {
  const body = JSON.stringify({ hello: 'world' });
  const sign = (secret: string) => `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

  it('accepts a valid signature', () => {
    expect(verifyWebhookSignature('s3cret', body, sign('s3cret'))).toBe(true);
  });

  it('rejects a wrong secret, a missing header or a malformed header', () => {
    expect(verifyWebhookSignature('s3cret', body, sign('other'))).toBe(false);
    expect(verifyWebhookSignature('s3cret', body, null)).toBe(false);
    expect(verifyWebhookSignature('s3cret', body, 'sha1=abc')).toBe(false);
  });
});

describe('parsePushEvent', () => {
  it('extracts commits and skips malformed ones', () => {
    const records = parsePushEvent({
      repository: { full_name: 'Migsak/ops' },
      commits: [
        { id: SHA, message: 'feat: check-in', timestamp: '2026-11-09T10:00:00+05:30', url: 'https://github.com/x', author: { username: 'GaganKI', name: 'Gagan', email: 'g@x.dev' } },
        { id: 'not-a-sha', message: 'bad', timestamp: '2026-11-09T10:00:00Z', url: 'https://github.com/y' },
        { id: 'b'.repeat(40), message: 'no time', url: 'https://github.com/z' }
      ]
    });
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ repo: 'Migsak/ops', sha: SHA, author_login: 'GaganKI', committed_at: '2026-11-09T04:30:00.000Z' });
  });

  it('returns nothing for unexpected payloads', () => {
    expect(parsePushEvent(null)).toEqual([]);
    expect(parsePushEvent({ commits: [] })).toEqual([]);
  });
});

describe('REST commits', () => {
  const item = { sha: SHA, html_url: 'https://github.com/c', author: { login: 'ira' }, commit: { message: 'fix', author: { name: 'Ira', email: 'i@x.dev', date: '2026-11-09T05:00:00Z' } } };

  it('parses API items', () => {
    expect(parseApiCommits('o/r', [item, { sha: 'x' }])).toHaveLength(1);
  });

  it('follows pagination and stops on a short page', async () => {
    const full = Array.from({ length: 100 }, (_, i) => ({ ...item, sha: i.toString(16).padStart(40, '0') }));
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(full), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([item]), { status: 200 }));
    const result = await fetchRepoCommits('o/r', 'token', new Date('2026-11-01T00:00:00Z'), { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(result).toHaveLength(101);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('treats an empty repository as no commits and reports access errors', async () => {
    const empty = vi.fn().mockResolvedValue(new Response('{}', { status: 409 }));
    await expect(fetchRepoCommits('o/r', 't', new Date(), { fetchImpl: empty as unknown as typeof fetch })).resolves.toEqual([]);
    const missing = vi.fn().mockResolvedValue(new Response('{}', { status: 404 }));
    await expect(fetchRepoCommits('o/r', 't', new Date(), { fetchImpl: missing as unknown as typeof fetch })).rejects.toThrow('not found');
  });

  it('links commits to people case-insensitively', () => {
    const [linked] = attachUserIds(parseApiCommits('o/r', [item]), new Map([['ira', 'user-1']]));
    expect(linked?.user_id).toBe('user-1');
  });
});
