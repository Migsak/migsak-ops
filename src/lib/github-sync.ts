import 'server-only';
import { githubToken } from '@/lib/env';
import { attachUserIds, fetchRepoCommits, GitHubApiError, type CommitRecord, type UsernameMap } from '@/lib/github';
import { createLogger } from '@/lib/logger';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { TrackedRepo } from '@/lib/types';

const log = createLogger('github-sync');

/** First sync looks back this far; later syncs overlap the last one by a day. */
const INITIAL_LOOKBACK_DAYS = 90;
const OVERLAP_MS = 24 * 60 * 60 * 1000;

export async function loadUsernameMap(): Promise<UsernameMap> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from('profiles').select('id, github_username').not('github_username', 'is', null);
  if (error) throw error;
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.github_username) map.set(String(row.github_username).toLowerCase(), String(row.id));
  }
  return map;
}

/** Upserts commits, linking each to a profile by GitHub username. Returns the number written. */
export async function saveCommits(records: readonly CommitRecord[], users?: UsernameMap): Promise<number> {
  if (records.length === 0) return 0;
  const map = users ?? (await loadUsernameMap());
  const rows = attachUserIds(records, map);
  const admin = getSupabaseAdmin();
  const { error } = await admin.from('commits').upsert(rows, { onConflict: 'repo,sha' });
  if (error) throw error;
  return rows.length;
}

export interface SyncResult {
  repo: string;
  fetched: number;
  error: string | null;
}

/** Backfills commits for every active tracked repo. Safe to run repeatedly. */
export async function syncTrackedRepos(): Promise<SyncResult[]> {
  const token = githubToken();
  const admin = getSupabaseAdmin();
  const { data: repos, error } = await admin.from('tracked_repos').select('*').eq('active', true);
  if (error) throw error;
  if (!repos || repos.length === 0) return [];
  if (!token) {
    log.warn('GITHUB_TOKEN is not set; skipping sync');
    return (repos as TrackedRepo[]).map((r) => ({ repo: r.full_name, fetched: 0, error: 'GITHUB_TOKEN is not configured.' }));
  }

  const users = await loadUsernameMap();
  const results: SyncResult[] = [];

  for (const repo of repos as TrackedRepo[]) {
    const since = repo.last_synced_at
      ? new Date(new Date(repo.last_synced_at).getTime() - OVERLAP_MS)
      : new Date(Date.now() - INITIAL_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    try {
      const records = await fetchRepoCommits(repo.full_name, token, since);
      const written = await saveCommits(records, users);
      await admin
        .from('tracked_repos')
        .update({ last_synced_at: new Date().toISOString(), last_sync_error: null })
        .eq('id', repo.id);
      results.push({ repo: repo.full_name, fetched: written, error: null });
      log.info('repo synced', () => ({ repo: repo.full_name, written }));
    } catch (err) {
      const message = err instanceof GitHubApiError ? err.message : 'Sync failed. Check the server logs.';
      await admin.from('tracked_repos').update({ last_sync_error: message }).eq('id', repo.id);
      results.push({ repo: repo.full_name, fetched: 0, error: message });
      log.error('repo sync failed', () => ({ repo: repo.full_name, err }));
    }
  }
  return results;
}

/** Re-links stored commits to profiles, used after a GitHub username is added or changed. */
export async function relinkCommitsForUser(userId: string, githubUsername: string | null): Promise<void> {
  const admin = getSupabaseAdmin();
  await admin.from('commits').update({ user_id: null }).eq('user_id', userId);
  if (githubUsername) {
    await admin.from('commits').update({ user_id: userId }).ilike('author_login', githubUsername);
  }
}
