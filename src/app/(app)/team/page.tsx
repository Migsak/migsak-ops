import type { Metadata } from 'next';
import { requireViewer } from '@/lib/auth';
import { appTimezone } from '@/lib/env';
import { isTracked } from '@/lib/metrics';
import { listProfiles, listTasks, listTeams } from '@/lib/queries';
import { loadTeamSnapshot } from '@/lib/team-data';
import { formatDateKey, formatDateTime } from '@/lib/time';
import { Avatar, Card, CardBody, CardHeader, EmptyState, Notice, PageHeader } from '@/components/ui';
import { PeopleTable } from '@/components/work/PeopleTable';
import { TaskList } from '@/components/work/TaskList';
import { CommitList } from '@/components/work/CommitList';
import { CountChart } from '@/components/charts/CountChart';
import { LiveRefresh } from '@/components/live/LiveRefresh';

export const metadata: Metadata = { title: 'Team' };

export default async function TeamPage() {
  const viewer = await requireViewer();
  const tz = appTimezone();
  const teamId = viewer.profile.team_id;

  const [teams, everyone, teamTasks] = await Promise.all([
    listTeams(),
    listProfiles({ activeOnly: true }),
    teamId ? listTasks({ teamId, includeDone: false }) : Promise.resolve([])
  ]);
  const team = teams.find((t) => t.id === teamId) ?? null;
  // Admins can see everyone; on this page show only the viewer's own team.
  const members = team ? everyone.filter((p) => p.team_id === team.id) : everyone.filter((p) => p.id === viewer.userId);
  // Admins run the workspace; show them only if they are the viewer and have no team.
  const trackedMembers = members.filter((p) => isTracked(p) || (!team && p.id === viewer.userId));
  const snapshot = await loadTeamSnapshot(trackedMembers, tz, { tasks: teamTasks });
  const peopleMap = new Map(members.map((p) => [p.id, p]));
  const todaysUpdates = snapshot.updates.filter((u) => u.work_date === snapshot.today);

  return (
    <>
      <PageHeader
        title={team ? team.name : 'Team'}
        description={team?.description ?? 'Who is working now, what the team shipped today and what is in progress.'}
        actions={<LiveRefresh tables={['attendance_sessions', 'daily_updates', 'tasks', 'commits']} />}
      />

      {!team ? (
        <div className="mb-6">
          <Notice tone="warn">You are not in a team yet. Ask your admin to add you to one to see your teammates here.</Notice>
        </div>
      ) : null}

      <Card className="mb-6">
        <CardHeader title="Right now" description={`${snapshot.rows.filter((r) => r.workingSince).length} of ${snapshot.rows.length} working`} />
        <PeopleTable rows={snapshot.rows} tz={tz} />
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Team commits" description="Last 14 days" />
          <CardBody>
            {snapshot.commitKeys.length > 0 ? (
              <CountChart data={snapshot.commitChart} keys={snapshot.commitKeys} label="Team commits per day" />
            ) : (
              <EmptyState title="No commits yet" description="Commits to tracked repositories show up here as they are pushed." />
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Latest commits" />
          <CommitList commits={snapshot.commits} people={peopleMap} limit={8} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Today's updates" description={formatDateKey(snapshot.today, { weekday: 'long', day: 'numeric', month: 'short' })} />
          {todaysUpdates.length === 0 ? (
            <EmptyState title="No updates yet today" />
          ) : (
            <ul className="divide-y divide-line">
              {todaysUpdates.map((u) => {
                const p = peopleMap.get(u.user_id);
                return (
                  <li key={u.id} className="flex gap-3 px-5 py-4">
                    <Avatar name={p?.full_name ?? '?'} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs">
                        <span className="font-medium text-ink">{p?.full_name}</span>
                        <span className="text-ink-muted"> · {formatDateTime(u.updated_at, tz)}</span>
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{u.done}</p>
                      {u.blockers ? <p className="mt-1 text-xs text-amber-800">Blocked: {u.blockers}</p> : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Team tasks in progress" />
          <TaskList tasks={teamTasks} today={snapshot.today} people={peopleMap} emptyTitle="No open team tasks" />
        </Card>
      </div>
    </>
  );
}
