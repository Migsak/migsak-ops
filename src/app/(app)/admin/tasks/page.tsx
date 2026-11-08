import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import clsx from 'clsx';
import { appTimezone } from '@/lib/env';
import { isOverdue } from '@/lib/metrics';
import { listProfiles, listTasks } from '@/lib/queries';
import { formatDateKey, todayKey } from '@/lib/time';
import { TASK_STATUSES, TASK_STATUS_LABELS } from '@/lib/types';
import { ButtonLink, Card, EmptyState, PageHeader, Table, Td, Th } from '@/components/ui';
import { PriorityBadge, StatusBadge } from '@/components/work/TaskBadges';
import { LiveRefresh } from '@/components/live/LiveRefresh';

export const metadata: Metadata = { title: 'All tasks' };

export default async function AdminTasksPage({ searchParams }: { searchParams: Promise<{ status?: string; person?: string }> }) {
  const { status, person } = await searchParams;
  const today = todayKey(appTimezone());
  const [tasks, people] = await Promise.all([listTasks(), listProfiles()]);
  const peopleMap = new Map(people.map((p) => [p.id, p]));

  const filtered = tasks.filter((t) => {
    if (status === 'overdue') {
      if (!isOverdue(t, today)) return false;
    } else if (status === 'open') {
      if (t.status === 'done') return false;
    } else if (status && status !== 'all' && t.status !== status) return false;
    if (person && t.assignee_id !== person) return false;
    return true;
  });

  const statusFilters = [
    { key: 'open', label: 'Open' },
    ...TASK_STATUSES.map((s) => ({ key: s, label: TASK_STATUS_LABELS[s] })),
    { key: 'overdue', label: 'Overdue' },
    { key: 'all', label: 'All' }
  ];
  const current = status ?? 'open';
  const href = (s: string) => `/admin/tasks?status=${s}${person ? `&person=${person}` : ''}`;

  return (
    <>
      <PageHeader
        title="All tasks"
        description="Assign, track and review work across the team."
        actions={
          <>
            <LiveRefresh tables={['tasks']} />
            <ButtonLink href="/admin/tasks/new">
              <Plus size={15} aria-hidden="true" />
              New task
            </ButtonLink>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {statusFilters.map((f) => (
          <Link
            key={f.key}
            href={href(f.key)}
            className={clsx(
              'rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset',
              current === f.key ? 'bg-brand-50 text-brand-700 ring-brand-100' : 'bg-white text-ink-muted ring-line hover:text-ink'
            )}
          >
            {f.label}
          </Link>
        ))}
        {person ? (
          <Link href={`/admin/tasks?status=${current}`} className="text-xs text-brand-600 hover:underline">
            Clear person filter ({peopleMap.get(person)?.full_name})
          </Link>
        ) : null}
      </div>
      <Card>
        {filtered.length === 0 ? (
          <EmptyState title="No tasks match" action={<ButtonLink href="/admin/tasks/new">New task</ButtonLink>} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Task</Th>
                <Th>Assignee</Th>
                <Th>Status</Th>
                <Th>Priority</Th>
                <Th>Due</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((t) => {
                const assignee = t.assignee_id ? peopleMap.get(t.assignee_id) : undefined;
                const overdue = isOverdue(t, today);
                return (
                  <tr key={t.id} className="hover:bg-canvas/60">
                    <Td className="max-w-md whitespace-normal">
                      <Link href={`/tasks/${t.id}`} className="font-medium text-ink hover:text-brand-600 hover:underline">
                        {t.title}
                      </Link>
                    </Td>
                    <Td className="text-xs">
                      {assignee ? (
                        <Link href={`/admin/tasks?status=${current}&person=${assignee.id}`} className="hover:underline">
                          {assignee.full_name}
                        </Link>
                      ) : (
                        <span className="text-ink-subtle">Unassigned</span>
                      )}
                    </Td>
                    <Td>
                      <StatusBadge status={t.status} />
                    </Td>
                    <Td>
                      <PriorityBadge priority={t.priority} />
                    </Td>
                    <Td className={clsx('text-xs', overdue ? 'font-medium text-red-600' : 'text-ink-muted')}>
                      {t.due_date ? formatDateKey(t.due_date) : 'No date'}
                      {overdue ? ' · overdue' : ''}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
