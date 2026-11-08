import Link from 'next/link';
import { Avatar, Badge, EmptyState, ProgressBar, Table, Td, Th } from '@/components/ui';
import { formatMinutes, formatTime } from '@/lib/time';

export interface PersonRow {
  id: string;
  name: string;
  subtitle: string;
  workingSince: string | null;
  todayMinutes: number;
  todayTarget: number;
  weekMinutes: number;
  weekTarget: number;
  updateToday: boolean;
  commits7d: number;
  openTasks: number;
}

/** Live status table used on the team page and the admin dashboard. */
export function PeopleTable({ rows, tz, linkBase }: { rows: PersonRow[]; tz: string; linkBase?: string }) {
  if (rows.length === 0) {
    return <EmptyState title="No one to show yet" description="Interns and employees appear here once they are added under People." />;
  }
  return (
    <Table>
      <thead>
        <tr>
          <Th>Person</Th>
          <Th>Status</Th>
          <Th>Today</Th>
          <Th className="min-w-[160px]">This week</Th>
          <Th>Update</Th>
          <Th className="text-right">Open tasks</Th>
          <Th className="text-right">Commits (7d)</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {rows.map((r) => (
          <tr key={r.id} className="hover:bg-canvas/60">
            <Td>
              <div className="flex items-center gap-2.5">
                <Avatar name={r.name} size="sm" />
                <div className="min-w-0">
                  {linkBase ? (
                    <Link href={`${linkBase}/${r.id}`} className="font-medium text-ink hover:text-brand-600 hover:underline">
                      {r.name}
                    </Link>
                  ) : (
                    <p className="font-medium text-ink">{r.name}</p>
                  )}
                  <p className="text-xs text-ink-muted">{r.subtitle}</p>
                </div>
              </div>
            </Td>
            <Td>
              {r.workingSince ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                  Working since {formatTime(r.workingSince, tz)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
                  <span className="h-2 w-2 rounded-full bg-gray-300" aria-hidden="true" />
                  Off
                </span>
              )}
            </Td>
            <Td className="tabular text-xs">
              {formatMinutes(r.todayMinutes)}
              {r.todayTarget > 0 ? <span className="text-ink-muted"> / {formatMinutes(r.todayTarget)}</span> : null}
            </Td>
            <Td>
              <div className="flex items-center gap-2">
                <ProgressBar value={r.weekTarget > 0 ? r.weekMinutes / r.weekTarget : 0} width="w-16" className="shrink-0" label={`${r.name} weekly progress`} />
                <span className="tabular text-xs text-ink-muted">
                  {formatMinutes(r.weekMinutes)}
                  {r.weekTarget > 0 ? ` / ${formatMinutes(r.weekTarget)}` : ''}
                </span>
              </div>
            </Td>
            <Td>{r.updateToday ? <Badge tone="green">Submitted</Badge> : <Badge tone="neutral">Pending</Badge>}</Td>
            <Td className="tabular text-right text-xs">{r.openTasks}</Td>
            <Td className="tabular text-right text-xs">{r.commits7d}</Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
