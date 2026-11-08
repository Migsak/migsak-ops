import type { Metadata } from 'next';
import { requireViewer } from '@/lib/auth';
import { PageHeader } from '@/components/ui';
import { PersonAnalytics } from '@/components/work/PersonAnalytics';
import { LiveRefresh } from '@/components/live/LiveRefresh';

export const metadata: Metadata = { title: 'Performance' };

export default async function PerformancePage() {
  const viewer = await requireViewer();
  return (
    <>
      <PageHeader
        title="My performance"
        description="Your hours, updates, tasks and commits over the last 30 days. Your admin sees the same numbers."
        actions={<LiveRefresh tables={['attendance_sessions', 'commits', 'tasks']} />}
      />
      <PersonAnalytics profile={viewer.profile} />
    </>
  );
}
