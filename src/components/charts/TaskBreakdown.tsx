import type { TaskStats } from '@/lib/metrics';

const SEGMENTS: { key: keyof Omit<TaskStats, 'overdue' | 'total'>; label: string; color: string }[] = [
  { key: 'todo', label: 'To do', color: '#DADCE0' },
  { key: 'in_progress', label: 'In progress', color: '#1A73E8' },
  { key: 'review', label: 'In review', color: '#F9AB00' },
  { key: 'done', label: 'Done', color: '#1E8E3E' }
];

/** Stacked bar of tasks by status with a legend. */
export function TaskBreakdown({ stats }: { stats: TaskStats }) {
  const total = Math.max(1, stats.total);
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100" role="img" aria-label="Tasks by status">
        {SEGMENTS.map((s) =>
          stats[s.key] > 0 ? <div key={s.key} style={{ width: `${(stats[s.key] / total) * 100}%`, background: s.color }} /> : null
        )}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2">
        {SEGMENTS.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} aria-hidden="true" />
            <dt className="whitespace-nowrap text-xs text-ink-muted">{s.label}</dt>
            <dd className="tabular ml-auto text-xs font-semibold text-ink">{stats[s.key]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
