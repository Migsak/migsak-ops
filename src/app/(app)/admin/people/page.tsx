import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { appTimezone } from '@/lib/env';
import { daysRemaining } from '@/lib/metrics';
import { listProfiles, listTeams } from '@/lib/queries';
import { formatDateKey, formatMinutes, todayKey } from '@/lib/time';
import { Avatar, Badge, ButtonLink, Card, EmptyState, PageHeader, Table, Td, Th } from '@/components/ui';

export const metadata: Metadata = { title: 'People' };

const FILTERS = [
  { key: 'active', label: 'Active' },
  { key: 'intern', label: 'Interns' },
  { key: 'employee', label: 'Employees' },
  { key: 'inactive', label: 'Inactive' },
  { key: 'all', label: 'All' }
] as const;

export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show = 'active' } = await searchParams;
  const today = todayKey(appTimezone());
  const [people, teams] = await Promise.all([listProfiles(), listTeams()]);
  const teamName = new Map(teams.map((t) => [t.id, t.name]));

  const filtered = people.filter((p) => {
    switch (show) {
      case 'intern':
        return p.status === 'active' && p.member_type === 'intern';
      case 'employee':
        return p.status === 'active' && p.member_type === 'employee';
      case 'inactive':
        return p.status === 'inactive';
      case 'all':
        return true;
      default:
        return p.status === 'active';
    }
  });

  return (
    <>
      <PageHeader
        title="People"
        description="Employees and interns, their roles, timings and periods."
        actions={
          <ButtonLink href="/admin/people/new">
            <Plus size={15} aria-hidden="true" />
            Add person
          </ButtonLink>
        }
      />
      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Filter people">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === 'active' ? '/admin/people' : `/admin/people?show=${f.key}`}
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${show === f.key ? 'bg-brand-50 text-brand-700 ring-brand-100' : 'bg-white text-ink-muted ring-line hover:text-ink'}`}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      <Card>
        {filtered.length === 0 ? (
          <EmptyState title="No one here yet" action={<ButtonLink href="/admin/people/new">Add person</ButtonLink>} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Role</Th>
                <Th>Team</Th>
                <Th>Period</Th>
                <Th>Daily target</Th>
                <Th>GitHub</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((p) => {
                const left = daysRemaining(p.end_date, today);
                return (
                  <tr key={p.id} className="hover:bg-canvas/60">
                    <Td>
                      <Link href={`/admin/people/${p.id}`} className="flex items-center gap-2.5">
                        <Avatar name={p.full_name} size="sm" />
                        <span>
                          <span className="block font-medium text-ink hover:text-brand-600">{p.full_name}</span>
                          <span className="block text-xs text-ink-muted">{p.email}</span>
                        </span>
                      </Link>
                    </Td>
                    <Td>
                      <span className="block text-sm">{p.job_title ?? 'No title'}</span>
                      <span className="mt-0.5 flex gap-1">
                        <Badge tone={p.member_type === 'intern' ? 'violet' : 'blue'}>{p.member_type === 'intern' ? 'Intern' : 'Employee'}</Badge>
                        {p.app_role === 'admin' ? <Badge tone="amber">Admin</Badge> : null}
                      </span>
                    </Td>
                    <Td className="text-xs">{p.team_id ? teamName.get(p.team_id) : <span className="text-ink-subtle">No team</span>}</Td>
                    <Td className="text-xs">
                      {p.start_date || p.end_date ? (
                        <>
                          {p.start_date ? formatDateKey(p.start_date) : 'Open start'} to {p.end_date ? formatDateKey(p.end_date) : 'ongoing'}
                        </>
                      ) : (
                        <span className="text-ink-subtle">Not set</span>
                      )}
                      {left !== null && p.status === 'active' ? <span className="block text-ink-muted">{left === 0 ? 'Ended' : `${left} days left`}</span> : null}
                    </Td>
                    <Td className="tabular text-xs">
                      {formatMinutes(p.weekday_target_minutes)} weekdays
                      <span className="block text-ink-muted">{formatMinutes(p.weekend_target_minutes)} weekends</span>
                    </Td>
                    <Td className="font-mono text-xs">{p.github_username ?? <span className="font-sans text-ink-subtle">Not set</span>}</Td>
                    <Td>{p.status === 'active' ? <Badge tone="green">Active</Badge> : <Badge tone="neutral">Inactive</Badge>}</Td>
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
