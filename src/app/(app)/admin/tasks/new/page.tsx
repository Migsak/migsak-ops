import type { Metadata } from 'next';
import Link from 'next/link';
import { listProfiles, listTeams } from '@/lib/queries';
import { Card, CardBody, PageHeader } from '@/components/ui';
import { TaskForm } from '@/components/work/TaskForm';

export const metadata: Metadata = { title: 'New task' };

export default async function NewTaskPage() {
  const [people, teams] = await Promise.all([listProfiles({ activeOnly: true }), listTeams()]);
  return (
    <>
      <Link href="/admin/tasks" className="mb-2 inline-block text-xs text-ink-muted hover:text-ink">
        Back to tasks
      </Link>
      <PageHeader title="New task" description="The assignee sees it on their home page straight away." />
      <Card className="max-w-3xl">
        <CardBody className="py-6">
          <TaskForm people={people} teams={teams} />
        </CardBody>
      </Card>
    </>
  );
}
