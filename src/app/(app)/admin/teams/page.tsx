import type { Metadata } from 'next';
import Link from 'next/link';
import { listProfiles, listTeams } from '@/lib/queries';
import { deleteTeam } from '@/app/actions/admin';
import { Avatar, Button, Card, CardBody, CardHeader, EmptyState, PageHeader } from '@/components/ui';
import { TeamForm } from '@/components/admin/TeamForm';

export const metadata: Metadata = { title: 'Teams' };

export default async function TeamsPage() {
  const [teams, people] = await Promise.all([listTeams(), listProfiles({ activeOnly: true })]);
  const unassigned = people.filter((p) => !p.team_id);

  return (
    <>
      <PageHeader title="Teams" description="Teammates can see each other's status, updates, tasks and commits. Assign people to a team from their profile." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {teams.length === 0 ? (
            <Card>
              <EmptyState title="No teams yet" description="Create a team, for example Developers, then add people to it from their profile." />
            </Card>
          ) : (
            teams.map((team) => {
              const members = people.filter((p) => p.team_id === team.id);
              return (
                <Card key={team.id}>
                  <CardHeader title={team.name} description={`${members.length} ${members.length === 1 ? 'member' : 'members'}`} />
                  <CardBody className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      {members.length === 0 ? (
                        <p className="text-sm text-ink-muted">No members yet.</p>
                      ) : (
                        <ul className="space-y-2">
                          {members.map((m) => (
                            <li key={m.id}>
                              <Link href={`/admin/people/${m.id}`} className="flex items-center gap-2 text-sm text-ink hover:text-brand-600">
                                <Avatar name={m.full_name} size="sm" />
                                {m.full_name}
                                <span className="text-xs text-ink-muted">{m.job_title}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="space-y-3">
                      <TeamForm team={team} />
                      <form action={deleteTeam} className="flex justify-end">
                        <input type="hidden" name="id" value={team.id} />
                        <Button type="submit" variant="ghost" size="sm" className="text-red-700 hover:bg-red-50 hover:text-red-800">
                          Delete team
                        </Button>
                      </form>
                    </div>
                  </CardBody>
                </Card>
              );
            })
          )}
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="New team" />
            <CardBody>
              <TeamForm />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Not in a team" description="They only see their own data." />
            <CardBody>
              {unassigned.length === 0 ? (
                <p className="text-sm text-ink-muted">Everyone is in a team.</p>
              ) : (
                <ul className="space-y-2">
                  {unassigned.map((p) => (
                    <li key={p.id}>
                      <Link href={`/admin/people/${p.id}?tab=edit`} className="text-sm text-brand-600 hover:underline">
                        {p.full_name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
