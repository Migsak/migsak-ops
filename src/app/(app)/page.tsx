import type { Metadata } from 'next';
import { requireViewer } from '@/lib/auth';
import { appTimezone } from '@/lib/env';
import { dailySeries, minutesByDay, summarise, targetMinutesFor } from '@/lib/metrics';
import { getUpdate, listCommits, listSessions, listTasks } from '@/lib/queries';
import { addDays, formatDateKey, formatMinutes, formatTime, startOfWeekKey, todayKey, zonedStartOfDay } from '@/lib/time';
import { ButtonLink, Card, CardBody, CardHeader, ProgressBar } from '@/components/ui';
import { CheckInCard } from '@/components/work/CheckInCard';
import { DailyUpdateForm } from '@/components/work/DailyUpdateForm';
import { TaskList } from '@/components/work/TaskList';
import { CommitList } from '@/components/work/CommitList';
import { LiveRefresh } from '@/components/live/LiveRefresh';

export const metadata: Metadata = { title: 'Home' };

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default async function HomePage() {
  const viewer = await requireViewer();
  const { profile } = viewer;
  const tz = appTimezone();
  const now = new Date();
  const today = todayKey(tz, now);
  const weekStart = startOfWeekKey(today);
  const weekEnd = addDays(weekStart, 6);

  const [sessions, update, tasks, commits] = await Promise.all([
    listSessions([viewer.userId], zonedStartOfDay(weekStart, tz)),
    getUpdate(viewer.userId, today),
    listTasks({ assigneeId: viewer.userId, includeDone: false }),
    listCommits({ userIds: [viewer.userId], since: zonedStartOfDay(addDays(today, -6), tz), limit: 20 })
  ]);

  const openSession = sessions.find((s) => s.check_out === null) ?? null;
  const closedToday = minutesByDay(
    sessions.filter((s) => s.check_out !== null),
    tz,
    now
  ).get(today) ?? 0;
  // The open session may have started before midnight; only count today's part on the client.
  const openSinceForToday = openSession
    ? new Date(Math.max(new Date(openSession.check_in).getTime(), zonedStartOfDay(today, tz).getTime())).toISOString()
    : null;

  const week = summarise(dailySeries(sessions, profile, weekStart, weekEnd, tz, now));
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(now));

  return (
    <>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-heading text-ink">
            {greeting(hour)}, {profile.full_name.split(' ')[0]}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">{formatDateKey(today, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <LiveRefresh tables={['attendance_sessions', 'tasks', 'commits']} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <CheckInCard
            openSince={openSinceForToday}
            openSinceLabel={openSession ? formatTime(openSession.check_in, tz) : null}
            closedMinutesToday={closedToday}
            targetMinutes={targetMinutesFor(profile, today)}
          />
          <Card>
            <CardHeader title="Today's update" description="A short summary for the team. Takes two minutes." />
            <CardBody>
              <DailyUpdateForm existing={update} />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="This week" description={`${formatDateKey(weekStart)} to ${formatDateKey(weekEnd)}`} />
            <CardBody>
              <div className="flex items-baseline justify-between">
                <p className="tabular text-2xl font-semibold text-ink">{formatMinutes(week.minutes)}</p>
                <p className="text-xs text-ink-muted">of {formatMinutes(week.target)} target</p>
              </div>
              <ProgressBar value={week.completion ?? 0} className="mt-3" label="Weekly progress toward target" />
              <p className="mt-3 text-xs text-ink-muted">
                {week.daysPresent} {week.daysPresent === 1 ? 'day' : 'days'} worked this week
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="My open tasks" action={<ButtonLink href="/tasks" variant="ghost" size="sm">View all</ButtonLink>} />
            <TaskList tasks={tasks.slice(0, 6)} today={today} emptyTitle="Nothing assigned" emptyDescription="New tasks from your admin will show up here." />
          </Card>

          <Card>
            <CardHeader title="My recent commits" description="Last 7 days" />
            <CommitList
              commits={commits}
              limit={6}
              emptyDescription={
                profile.github_username
                  ? 'Commits to tracked repositories will show up here.'
                  : 'Ask your admin to add your GitHub username to your profile.'
              }
            />
          </Card>
        </div>
      </div>
    </>
  );
}
