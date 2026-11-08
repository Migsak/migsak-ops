'use client';

import { useActionState } from 'react';
import { saveDailyUpdate } from '@/app/actions/work';
import { initialActionState } from '@/lib/action-state';
import type { DailyUpdate } from '@/lib/types';
import { Field } from '@/components/ui';
import { FormStatus } from '@/components/forms/FormStatus';
import { SubmitButton } from '@/components/forms/SubmitButton';

export function DailyUpdateForm({ existing }: { existing: DailyUpdate | null }) {
  const [state, action] = useActionState(saveDailyUpdate, initialActionState);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormStatus state={state} />
      <Field label="What did you work on today?" htmlFor="done" error={state.fieldErrors?.done}>
        <textarea id="done" name="done" rows={4} required defaultValue={existing?.done ?? ''} className="field-input" placeholder="Built the check-in screen and connected it to the API." />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Plan for tomorrow" htmlFor="next_steps" error={state.fieldErrors?.next_steps}>
          <textarea id="next_steps" name="next_steps" rows={3} defaultValue={existing?.next_steps ?? ''} className="field-input" />
        </Field>
        <Field label="Blockers" htmlFor="blockers" hint="Anything you need help with." error={state.fieldErrors?.blockers}>
          <textarea id="blockers" name="blockers" rows={3} defaultValue={existing?.blockers ?? ''} className="field-input" />
        </Field>
      </div>
      <Field label="Links" htmlFor="links" hint="Pull requests, commits, designs or demos. One per line." error={state.fieldErrors?.links}>
        <textarea id="links" name="links" rows={2} defaultValue={existing?.links.join('\n') ?? ''} className="field-input font-mono text-xs" placeholder="https://github.com/..." />
      </Field>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-ink-muted">{existing ? 'Submitted. You can edit it until the end of the day.' : 'Due by the end of each working day.'}</p>
        <SubmitButton pendingLabel="Saving...">{existing ? 'Update' : 'Submit update'}</SubmitButton>
      </div>
    </form>
  );
}
