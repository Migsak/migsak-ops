import Link from 'next/link';
import clsx from 'clsx';
import type { Profile, Task } from '@/lib/types';
import { isOverdue } from '@/lib/metrics';
import { formatDateKey } from '@/lib/time';
import { Avatar, EmptyState } from '@/components/ui';
import { PriorityBadge, StatusBadge } from './TaskBadges';

/** Compact task rows linking to the task page. */
export function TaskList({
  tasks,
  today,
  people,
  emptyTitle = 'No tasks',
  emptyDescription
}: {
  tasks: Task[];
  today: string;
  people?: Map<string, Profile>;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (tasks.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} />;
  return (
    <ul className="divide-y divide-line">
      {tasks.map((t) => {
        const overdue = isOverdue(t, today);
        const assignee = t.assignee_id ? people?.get(t.assignee_id) : undefined;
        return (
          <li key={t.id}>
            <Link href={`/tasks/${t.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-canvas">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{t.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={t.status} />
                  <PriorityBadge priority={t.priority} />
                  {t.due_date ? (
                    <span className={clsx('text-xs', overdue ? 'font-medium text-red-600' : 'text-ink-muted')}>
                      {overdue ? 'Overdue, was due ' : 'Due '}
                      {formatDateKey(t.due_date)}
                    </span>
                  ) : null}
                </div>
              </div>
              {assignee ? (
                <span className="hidden items-center gap-2 text-xs text-ink-muted sm:inline-flex">
                  <Avatar name={assignee.full_name} size="sm" />
                  {assignee.full_name.split(' ')[0]}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
