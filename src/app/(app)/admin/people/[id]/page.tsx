import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { appTimezone } from '@/lib/env';
import { getProfile, listSessions, listTeams } from '@/lib/queries';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { addDays, formatDateKey, formatDateTime, formatMinutes, dateKey, todayKey, zonedStartOfDay } from '@/lib/time';
import { MAX_SESSION_MS } from '@/lib/metrics';
import { Card, CardBody, CardHeader, EmptyState, PageHeader, Table, Td, Th } from '@/components/ui';
import { ProfileSummary } from '@/components/work/ProfileSummary';
import { PersonAnalytics } from '@/components/work/PersonAnalytics';
import { PersonForm } from '@/components/admin/PersonForm';
import { ResetPasswordButton } from '@/components/admin/ResetPasswordButton';
import { LiveRefresh } from '@/components/live/LiveRefresh';

export const metadata: Metadata = { title: 'Person' };

export default async function PersonPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = 'activity' } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const tz = appTimezone();
  const today = todayKey(tz);

  const supabase = await createSupabaseServerClient();
  const [profile, teams, notesRow] = await Promise.all([
    getProfile(id),
    listTeams(),
    supabase.from('person_notes').select('notes').eq('user_id', id).maybeSingle()
  ]);
  if (!profile) notFound();
  const team = teams.find((t) => t.id === profile.team_id) ?? null;
  const notes = (notesRow.data?.notes as string | undefined) ?? '';

  const tabs = [
    { key: 'activity', label: 'Activity' },
    { key: 'attendance', label: 'Attendance log' },
    { key: 'details', label: 'Details' },
    { key: 'edit', label: 'Edit' }
  ];

  return (
    <>
      <Link href="/admin/people" className="mb-2 inline-block text-xs text-ink-muted hover:text-ink">
        Back to people
      </Link>
      <PageHeader
        title={profile.full_name}
        description={[profile.job_title, team?.name, profile.email].filter(Boolean).join(' · ')}
        actions={<LiveRefresh tables={['attendance_sessions', 'daily_updates', 'tasks', 'commits']} />}
      />

      <nav className="mb-6 flex gap-1 border-b border-line" aria-label="Person sections">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.key === 'activity' ? `/admin/people/${id}` : `/admin/people/${id}?tab=${t.key}`}
            aria-current={tab === t.key ? 'page' : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === t.key ? 'border-brand-500 font-medium text-brand-700' : 'border-transparent text-ink-muted hover:text-ink'}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === 'activity' ? <PersonAnalytics profile={profile} /> : null}

      {tab === 'attendance' ? <AttendanceLog userId={id} tz={tz} today={today} /> : null}

      {tab === 'details' ? (
        <div className="space-y-6">
          <ProfileSummary profile={profile} team={team} />
          {notes ? (
            <Card>
              <CardHeader title="Private notes" description="Only admins can see these." />
              <CardBody>
                <p className="whitespace-pre-wrap text-sm text-ink">{notes}</p>
              </CardBody>
            </Card>
          ) : null}
        </div>
      ) : null}

      {tab === 'edit' ? (
        <div className="space-y-6">
          <Card>
            <CardBody className="py-6">
              <PersonForm person={profile} teams={teams} notes={notes} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Login" description={`Signs in as ${profile.email}`} />
            <CardBody>
              <ResetPasswordButton personId={profile.id} email={profile.email} />
            </CardBody>
          </Card>
        </div>
      ) : null}
    </>
  );
}

async function AttendanceLog({ userId, tz, today }: { userId: string; tz: string; today: string }) {
  const start = addDays(today, -29);
  const sessions = await listSessions([userId], zonedStartOfDay(start, tz));
  const now = Date.now();
  const inRange = sessions.filter((s) => dateKey(s.check_in, tz) >= start);
  return (
    <Card>
      <CardHeader title="Check-in history" description="Last 30 days" />
      {inRange.length === 0 ? (
        <EmptyState title="No check-ins in the last 30 days" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Checked in</Th>
              <Th>Checked out</Th>
              <Th className="text-right">Duration</Th>
              <Th>Note</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {inRange.map((s) => {
              const startMs = new Date(s.check_in).getTime();
              const endMs = Math.min(s.check_out ? new Date(s.check_out).getTime() : now, startMs + MAX_SESSION_MS);
              return (
                <tr key={s.id}>
                  <Td className="text-xs">{formatDateKey(dateKey(s.check_in, tz), { weekday: 'short', day: 'numeric', month: 'short' })}</Td>
                  <Td className="text-xs">{formatDateTime(s.check_in, tz)}</Td>
                  <Td className="text-xs">{s.check_out ? formatDateTime(s.check_out, tz) : <span className="font-medium text-emerald-700">Still working</span>}</Td>
                  <Td className="tabular text-right text-xs">{formatMinutes((endMs - startMs) / 60_000)}</Td>
                  <Td className="max-w-xs truncate text-xs text-ink-muted">{s.note ?? ''}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
