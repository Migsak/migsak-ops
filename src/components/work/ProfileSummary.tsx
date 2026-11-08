import { appTimezone } from '@/lib/env';
import { daysRemaining, periodProgress } from '@/lib/metrics';
import { formatDateKey, formatMinutes, todayKey } from '@/lib/time';
import type { Profile, Team } from '@/lib/types';
import { Avatar, Badge, Card, CardBody, CardHeader, ProgressBar } from '@/components/ui';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-2.5">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="col-span-2 break-words text-sm text-ink">{value ?? <span className="text-ink-subtle">Not set</span>}</dd>
    </div>
  );
}

function formatShift(start: string | null, end: string | null): string | null {
  if (!start || !end) return null;
  const fmt = (t: string) => {
    const [h = 0, m = 0] = t.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${suffix}`;
  };
  return `${fmt(start)} to ${fmt(end)}`;
}

/** Read-only profile card with internship/employment period progress. */
export function ProfileSummary({ profile, team }: { profile: Profile; team: Team | null }) {
  const today = todayKey(appTimezone());
  const remaining = daysRemaining(profile.end_date, today);
  const progress = periodProgress(profile.start_date, profile.end_date, today);
  const typeLabel = profile.member_type === 'intern' ? 'Internship' : 'Employment';

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardBody className="flex flex-col items-center py-8 text-center">
          <Avatar name={profile.full_name} size="lg" />
          <p className="mt-3 text-base font-semibold text-ink">{profile.full_name}</p>
          <p className="text-xs text-ink-muted">{profile.job_title ?? (profile.member_type === 'intern' ? 'Intern' : 'Employee')}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            <Badge tone={profile.member_type === 'intern' ? 'neutral' : 'blue'}>{profile.member_type === 'intern' ? 'Intern' : 'Employee'}</Badge>
            {profile.app_role === 'admin' ? <Badge tone="amber">Admin</Badge> : null}
            {profile.status === 'inactive' ? <Badge tone="red">Inactive</Badge> : null}
          </div>
          {progress !== null ? (
            <div className="mt-6 w-full text-left">
              <div className="flex justify-between text-xs">
                <span className="text-ink-muted">{typeLabel} progress</span>
                <span className="font-medium text-ink">{remaining === 0 ? 'Completed' : `${remaining} days left`}</span>
              </div>
              <ProgressBar value={progress} className="mt-2" label={`${typeLabel} progress`} />
              <p className="mt-2 text-[11px] text-ink-subtle">
                {formatDateKey(profile.start_date!, { day: 'numeric', month: 'short', year: 'numeric' })} to{' '}
                {formatDateKey(profile.end_date!, { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader title="Details" />
        <CardBody className="py-2">
          <dl className="divide-y divide-line">
            <Row label="Email" value={profile.email} />
            <Row label="Phone" value={profile.phone} />
            <Row label="Team" value={team?.name ?? null} />
            <Row label="Location" value={profile.location} />
            {profile.member_type === 'intern' ? <Row label="College" value={profile.college} /> : null}
            <Row
              label="GitHub"
              value={
                profile.github_username ? (
                  <a href={`https://github.com/${profile.github_username}`} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                    {profile.github_username}
                  </a>
                ) : null
              }
            />
            <Row label="Working hours" value={formatShift(profile.shift_start, profile.shift_end)} />
            <Row label="Daily target" value={`${formatMinutes(profile.weekday_target_minutes)} on weekdays · ${formatMinutes(profile.weekend_target_minutes)} on weekends`} />
            <Row
              label="Start date"
              value={profile.start_date ? formatDateKey(profile.start_date, { day: 'numeric', month: 'short', year: 'numeric' }) : null}
            />
            <Row label="End date" value={profile.end_date ? formatDateKey(profile.end_date, { day: 'numeric', month: 'short', year: 'numeric' }) : null} />
          </dl>
        </CardBody>
      </Card>
    </div>
  );
}
