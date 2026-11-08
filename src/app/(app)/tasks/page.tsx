import type { Metadata } from 'next';
import { requireViewer } from '@/lib/auth';
import { appTimezone } from '@/lib/env';
import { taskStats } from '@/lib/metrics';
import { listProfiles, listTasks } from '@/lib/queries';
import { todayKey } from '@/lib/time';
import { TASK_STATUSES, TASK_STATUS_LABELS } from '@/lib/types';
import { Card, CardHeader, PageHeader, Stat } from '@/components/ui';
import { TaskList } from '@/components/work/TaskList';
import { LiveRefresh } from '@/components/live/LiveRefresh';

export const metadata: Metadata = { title: 'My tasks' };

export default async function MyTasksPage() {
  const viewer = await requireViewer();
  const today = todayKey(appTimezone());
  const [mine, people] = await Promise.all([listTasks({ assigneeId: viewer.userId }), listProfiles()]);
  const stats = taskStats(mine, today);
  const peopleMap = new Map(people.map((p) => [p.id, p]));

  return (
    <>
      <PageHeader title="My tasks" description="Work assigned to you. Open a task to update it or attach your work." actions={<LiveRefresh tables={['tasks']} />} />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Open" value={stats.todo + stats.in_progress} />
        <Stat label="In review" value={stats.review} />
        <Stat label="Completed" value={stats.done} tone="good" />
        <Stat label="Overdue" value={stats.overdue} tone={stats.overdue > 0 ? 'warn' : 'default'} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {TASK_STATUSES.map((status) => {
          const list = mine.filter((t) => t.status === status);
          return (
            <Card key={status}>
              <CardHeader title={TASK_STATUS_LABELS[status]} description={`${list.length} ${list.length === 1 ? 'task' : 'tasks'}`} />
              <TaskList tasks={status === 'done' ? list.slice(0, 10) : list} today={today} people={peopleMap} emptyTitle="Nothing here" />
            </Card>
          );
        })}
      </div>
    </>
  );
}
