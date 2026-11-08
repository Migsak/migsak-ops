import { GitCommitHorizontal } from 'lucide-react';
import type { Commit, Profile } from '@/lib/types';
import { relativeTime } from '@/lib/time';
import { EmptyState } from '@/components/ui';

export function CommitList({
  commits,
  people,
  limit = 10,
  emptyDescription = 'Commits appear here once a tracked repository receives pushes.'
}: {
  commits: Commit[];
  people?: Map<string, Profile>;
  limit?: number;
  emptyDescription?: string;
}) {
  if (commits.length === 0) return <EmptyState title="No commits yet" description={emptyDescription} />;
  return (
    <ul className="divide-y divide-line">
      {commits.slice(0, limit).map((c) => {
        const person = c.user_id ? people?.get(c.user_id) : undefined;
        const firstLine = c.message.split('\n')[0] || '(no message)';
        return (
          <li key={`${c.repo}:${c.sha}`} className="flex items-start gap-3 px-5 py-3">
            <GitCommitHorizontal size={16} className="mt-0.5 shrink-0 text-ink-subtle" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <a href={c.url} target="_blank" rel="noreferrer" className="block truncate text-sm text-ink hover:text-brand-600 hover:underline">
                {firstLine}
              </a>
              <p className="mt-0.5 truncate text-xs text-ink-muted">
                {person ? `${person.full_name} · ` : c.author_login ? `${c.author_login} · ` : ''}
                <span className="font-mono">{c.repo}</span> · <span className="font-mono">{c.sha.slice(0, 7)}</span> · {relativeTime(c.committed_at)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
