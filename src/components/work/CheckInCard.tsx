'use client';

import { useActionState, useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { checkIn, checkOut } from '@/app/actions/work';
import { initialActionState } from '@/lib/action-state';
import { FormStatus } from '@/components/forms/FormStatus';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { ProgressBar } from '@/components/ui';

function format(minutes: number): string {
  const total = Math.max(0, Math.floor(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h === 0 ? `${m}m` : `${h}h ${String(m).padStart(2, '0')}m`;
}

function elapsedClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/**
 * Check-in control with a live timer. `closedMinutesToday` covers finished
 * sessions; the open session (if any) is added on the client every second.
 */
export function CheckInCard({
  openSince,
  openSinceLabel,
  closedMinutesToday,
  targetMinutes
}: {
  openSince: string | null;
  openSinceLabel: string | null;
  closedMinutesToday: number;
  targetMinutes: number;
}) {
  const [inState, inAction] = useActionState(checkIn, initialActionState);
  const [outState, outAction] = useActionState(checkOut, initialActionState);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!openSince) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [openSince]);

  const openMs = openSince ? now - new Date(openSince).getTime() : 0;
  const todayMinutes = closedMinutesToday + openMs / 60_000;
  const progress = targetMinutes > 0 ? todayMinutes / targetMinutes : 0;
  const state = openSince ? outState : inState;

  return (
    <section className="rounded-xl border border-line bg-white">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">Attendance</h2>
          <p className="mt-0.5 text-xs text-ink-muted">{openSince ? `Checked in at ${openSinceLabel}` : 'You are not checked in'}</p>
        </div>
        <span
          className={
            openSince
              ? 'inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-100'
              : 'inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-ink-muted ring-1 ring-inset ring-gray-200'
          }
        >
          <span className={openSince ? 'h-1.5 w-1.5 rounded-full bg-emerald-500' : 'h-1.5 w-1.5 rounded-full bg-gray-400'} aria-hidden="true" />
          {openSince ? 'Working' : 'Off'}
        </span>
      </div>

      <div className="px-5 py-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-ink-muted">Current session</p>
            <p className="tabular mt-1 font-mono text-3xl font-semibold tracking-heading text-ink" aria-live="off">
              {openSince ? elapsedClock(openMs) : '00:00:00'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-ink-muted">Today</p>
            <p className="tabular mt-1 text-lg font-semibold text-ink">
              {format(todayMinutes)}
              {targetMinutes > 0 ? <span className="text-sm font-normal text-ink-muted"> / {format(targetMinutes)}</span> : null}
            </p>
          </div>
        </div>
        {targetMinutes > 0 ? <ProgressBar value={progress} className="mt-4" label="Today's progress toward target" /> : null}

        <form action={openSince ? outAction : inAction} className="mt-5 space-y-3">
          <FormStatus state={state} />
          <label htmlFor="note" className="sr-only">
            Note
          </label>
          <input
            id="note"
            name="note"
            maxLength={500}
            placeholder={openSince ? 'What did you finish? (optional)' : 'What are you working on? (optional)'}
            className="field-input"
          />
          <SubmitButton className="w-full" variant={openSince ? 'secondary' : 'primary'} pendingLabel={openSince ? 'Checking out...' : 'Checking in...'}>
            <Clock size={15} aria-hidden="true" />
            {openSince ? 'Check out' : 'Check in'}
          </SubmitButton>
        </form>
      </div>
    </section>
  );
}
