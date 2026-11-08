import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * GitHub helpers: webhook signature checks, push-event parsing and the REST
 * call used for backfilling commits. No Supabase access here, so this module is
 * easy to test.
 */

export interface CommitRecord {
  repo: string;
  sha: string;
  author_login: string | null;
  author_name: string | null;
  author_email: string | null;
  message: string;
  url: string;
  committed_at: string;
}

const SHA_RE = /^[0-9a-f]{40}$/;

/** Verifies the X-Hub-Signature-256 header against the raw request body. */
export function verifyWebhookSignature(secret: string, rawBody: string, header: string | null): boolean {
  if (!header?.startsWith('sha256=')) return false;
  const expected = `sha256=${createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  return a.length === b.length && timingSafeEqual(a, b);
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function truncate(message: string, max = 2000): string {
  return message.length > max ? `${message.slice(0, max - 1)}…` : message;
}

/** Commits from a "push" webhook payload. Ignores anything malformed. */
export function parsePushEvent(payload: unknown): CommitRecord[] {
  if (!payload || typeof payload !== 'object') return [];
  const p = payload as Record<string, unknown>;
  const repo = str((p.repository as Record<string, unknown> | undefined)?.full_name);
  const commits = Array.isArray(p.commits) ? p.commits : [];
  if (!repo) return [];

  const out: CommitRecord[] = [];
  for (const raw of commits) {
    if (!raw || typeof raw !== 'object') continue;
    const c = raw as Record<string, unknown>;
    const sha = str(c.id);
    const url = str(c.url);
    const timestamp = str(c.timestamp);
    if (!sha || !SHA_RE.test(sha) || !url || !timestamp || Number.isNaN(Date.parse(timestamp))) continue;
    const author = (c.author ?? {}) as Record<string, unknown>;
    out.push({
      repo,
      sha,
      author_login: str(author.username),
      author_name: str(author.name),
      author_email: str(author.email),
      message: truncate(str(c.message) ?? ''),
      url,
      committed_at: new Date(timestamp).toISOString()
    });
  }
  return out;
}

/** Shape of one item from GET /repos/{owner}/{repo}/commits. */
interface ApiCommit {
  sha?: string;
  html_url?: string;
  author?: { login?: string } | null;
  commit?: { message?: string; author?: { name?: string; email?: string; date?: string } | null };
}

export function parseApiCommits(repo: string, items: unknown): CommitRecord[] {
  if (!Array.isArray(items)) return [];
  const out: CommitRecord[] = [];
  for (const raw of items as ApiCommit[]) {
    const sha = raw?.sha;
    const date = raw?.commit?.author?.date;
    if (!sha || !SHA_RE.test(sha) || !raw.html_url || !date || Number.isNaN(Date.parse(date))) continue;
    out.push({
      repo,
      sha,
      author_login: str(raw.author?.login),
      author_name: str(raw.commit?.author?.name),
      author_email: str(raw.commit?.author?.email),
      message: truncate(raw.commit?.message ?? ''),
      url: raw.html_url,
      committed_at: new Date(date).toISOString()
    });
  }
  return out;
}

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'GitHubApiError';
  }
}

/**
 * Commits on the default branch since the given time. Follows pagination up to
 * maxPages (100 commits per page).
 */
export async function fetchRepoCommits(
  repo: string,
  token: string,
  since: Date,
  options: { maxPages?: number; fetchImpl?: typeof fetch } = {}
): Promise<CommitRecord[]> {
  const { maxPages = 5, fetchImpl = fetch } = options;
  const results: CommitRecord[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const url = new URL(`https://api.github.com/repos/${repo}/commits`);
    url.searchParams.set('since', since.toISOString());
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));
    const res = await fetchImpl(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'migsak-ops'
      },
      cache: 'no-store'
    });
    if (res.status === 409) return results; // Empty repository.
    if (!res.ok) {
      const detail = res.status === 404 ? 'Repository not found or the token cannot access it.' : `GitHub returned ${res.status}.`;
      throw new GitHubApiError(detail, res.status);
    }
    const items: unknown = await res.json();
    const batch = parseApiCommits(repo, items);
    results.push(...batch);
    if (!Array.isArray(items) || items.length < 100) break;
  }
  return results;
}

/** Lower-cased GitHub username -> profile id. */
export type UsernameMap = ReadonlyMap<string, string>;

export function attachUserIds<T extends CommitRecord>(records: readonly T[], users: UsernameMap): (T & { user_id: string | null })[] {
  return records.map((r) => ({ ...r, user_id: r.author_login ? users.get(r.author_login.toLowerCase()) ?? null : null }));
}
