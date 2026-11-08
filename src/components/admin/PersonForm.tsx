'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { createPerson, updatePerson } from '@/app/actions/admin';
import { initialActionState } from '@/lib/action-state';
import type { Profile, Team } from '@/lib/types';
import { buttonClass, Field } from '@/components/ui';
import { FormStatus } from '@/components/forms/FormStatus';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { CredentialsNotice } from './CredentialsNotice';

function hours(minutes: number | undefined, fallback: number): string {
  const m = minutes ?? fallback;
  return String(Math.round((m / 60) * 100) / 100);
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid min-w-0 grid-cols-1 gap-6 border-t border-line py-6 first:border-t-0 first:pt-0 md:grid-cols-3">
      <div>
        <legend className="text-sm font-semibold text-ink">{title}</legend>
        {description ? <p className="mt-1 text-xs text-ink-muted">{description}</p> : null}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:col-span-2">{children}</div>
    </fieldset>
  );
}

/** Create or edit a person. On create, shows the one-time login details. */
export function PersonForm({ person, teams, notes = '' }: { person?: Profile; teams: Team[]; notes?: string }) {
  const [state, action] = useActionState(person ? updatePerson : createPerson, initialActionState);
  const [memberType, setMemberType] = useState(person?.member_type ?? 'intern');
  const e = state.fieldErrors ?? {};

  if (!person && state.ok && state.data?.password) {
    return (
      <div className="space-y-4">
        <CredentialsNotice email={state.data.email ?? ''} password={state.data.password} intro={state.message} />
        <div className="flex gap-2">
          <Link href={`/admin/people/${state.data.personId}`} className={buttonClass('primary')}>
            View profile
          </Link>
          {/* Full page load so the form starts empty. */}
          <button type="button" className={buttonClass('secondary')} onClick={() => window.location.assign('/admin/people/new')}>
            Add another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={action} noValidate>
      {person ? <input type="hidden" name="id" value={person.id} /> : null}
      <div className="mb-4">
        <FormStatus state={state} />
      </div>

      <Section title="Basics" description="Name and login email. The email is also their sign-in.">
        <Field label="Full name" htmlFor="full_name" error={e.full_name}>
          <input id="full_name" name="full_name" required defaultValue={person?.full_name} className="field-input" autoComplete="off" />
        </Field>
        <Field label="Email" htmlFor="email" error={e.email}>
          <input id="email" name="email" type="email" required defaultValue={person?.email} className="field-input" autoComplete="off" />
        </Field>
        <Field label="Phone" htmlFor="phone" error={e.phone}>
          <input id="phone" name="phone" type="tel" defaultValue={person?.phone ?? ''} className="field-input" />
        </Field>
        <Field label="Location" htmlFor="location" error={e.location}>
          <input id="location" name="location" defaultValue={person?.location ?? ''} className="field-input" />
        </Field>
      </Section>

      <Section title="Role" description="Admins can manage people, tasks and see every dashboard.">
        <Field label="Type" htmlFor="member_type" error={e.member_type}>
          <select
            id="member_type"
            name="member_type"
            value={memberType}
            onChange={(ev) => setMemberType(ev.target.value as 'intern' | 'employee')}
            className="field-input"
          >
            <option value="intern">Intern</option>
            <option value="employee">Employee</option>
          </select>
        </Field>
        <Field label="Job title" htmlFor="job_title" error={e.job_title}>
          <input id="job_title" name="job_title" defaultValue={person?.job_title ?? ''} placeholder="Software Developer Intern" className="field-input" />
        </Field>
        <Field label="Team" htmlFor="team_id" error={e.team_id}>
          <select id="team_id" name="team_id" defaultValue={person?.team_id ?? ''} className="field-input">
            <option value="">No team</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Access" htmlFor="app_role" error={e.app_role}>
          <select id="app_role" name="app_role" defaultValue={person?.app_role ?? 'member'} className="field-input">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
        {memberType === 'intern' ? (
          <Field label="College" htmlFor="college" error={e.college} className="sm:col-span-2">
            <input id="college" name="college" defaultValue={person?.college ?? ''} className="field-input" />
          </Field>
        ) : null}
        {person ? (
          <Field label="Status" htmlFor="status" hint="Inactive people cannot sign in or check in." error={e.status}>
            <select id="status" name="status" defaultValue={person.status} className="field-input">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
        ) : (
          <input type="hidden" name="status" value="active" />
        )}
      </Section>

      <Section
        title={memberType === 'intern' ? 'Internship period and timings' : 'Employment and timings'}
        description="Targets drive the attendance charts. Dates outside the period have no target."
      >
        <Field label="Start date" htmlFor="start_date" error={e.start_date}>
          <input id="start_date" name="start_date" type="date" defaultValue={person?.start_date ?? ''} className="field-input" />
        </Field>
        <Field label="End date" htmlFor="end_date" hint={memberType === 'intern' ? 'Last day of the internship.' : 'Leave empty if ongoing.'} error={e.end_date}>
          <input id="end_date" name="end_date" type="date" defaultValue={person?.end_date ?? ''} className="field-input" />
        </Field>
        <Field label="Usual start time" htmlFor="shift_start" error={e.shift_start}>
          <input id="shift_start" name="shift_start" type="time" defaultValue={person?.shift_start?.slice(0, 5) ?? ''} className="field-input" />
        </Field>
        <Field label="Usual end time" htmlFor="shift_end" error={e.shift_end}>
          <input id="shift_end" name="shift_end" type="time" defaultValue={person?.shift_end?.slice(0, 5) ?? ''} className="field-input" />
        </Field>
        <Field label="Weekday target (hours per day)" htmlFor="weekday_target_hours" error={e.weekday_target_hours}>
          <input
            id="weekday_target_hours"
            name="weekday_target_hours"
            type="number"
            min={0}
            max={24}
            step={0.5}
            defaultValue={hours(person?.weekday_target_minutes, 240)}
            className="field-input"
          />
        </Field>
        <Field label="Weekend target (hours per day)" htmlFor="weekend_target_hours" hint="For example 4 per day for 8 across the weekend." error={e.weekend_target_hours}>
          <input
            id="weekend_target_hours"
            name="weekend_target_hours"
            type="number"
            min={0}
            max={24}
            step={0.5}
            defaultValue={hours(person?.weekend_target_minutes, 240)}
            className="field-input"
          />
        </Field>
      </Section>

      <Section title="Work tracking" description="Commits from tracked repositories are matched to people by GitHub username.">
        <Field label="GitHub username" htmlFor="github_username" hint="Username only, for example gaganki." error={e.github_username}>
          <input id="github_username" name="github_username" defaultValue={person?.github_username ?? ''} className="field-input" autoComplete="off" />
        </Field>
        <Field label="Private notes" htmlFor="notes" hint="Only admins can see these." error={e.notes} className="sm:col-span-2">
          <textarea id="notes" name="notes" rows={3} defaultValue={notes} className="field-input" />
        </Field>
      </Section>

      <div className="flex justify-end border-t border-line pt-6">
        <SubmitButton pendingLabel="Saving...">{person ? 'Save changes' : 'Add person and create login'}</SubmitButton>
      </div>
    </form>
  );
}
