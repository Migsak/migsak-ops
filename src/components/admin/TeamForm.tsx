'use client';

import { useActionState, useEffect, useRef } from 'react';
import { saveTeam } from '@/app/actions/admin';
import { initialActionState } from '@/lib/action-state';
import type { Team } from '@/lib/types';
import { Field } from '@/components/ui';
import { FormStatus } from '@/components/forms/FormStatus';
import { SubmitButton } from '@/components/forms/SubmitButton';

export function TeamForm({ team }: { team?: Team }) {
  const [state, action] = useActionState(saveTeam, initialActionState);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && !team) ref.current?.reset();
  }, [state, team]);
  const e = state.fieldErrors ?? {};
  return (
    <form ref={ref} action={action} className="space-y-3" noValidate>
      {team ? <input type="hidden" name="id" value={team.id} /> : null}
      <FormStatus state={state} />
      <Field label="Team name" htmlFor={`name-${team?.id ?? 'new'}`} error={e.name}>
        <input id={`name-${team?.id ?? 'new'}`} name="name" required maxLength={80} defaultValue={team?.name} className="field-input" />
      </Field>
      <Field label="Description" htmlFor={`desc-${team?.id ?? 'new'}`} error={e.description}>
        <input id={`desc-${team?.id ?? 'new'}`} name="description" maxLength={500} defaultValue={team?.description ?? ''} className="field-input" />
      </Field>
      <div className="flex justify-end">
        <SubmitButton size="sm" pendingLabel="Saving...">
          {team ? 'Save' : 'Create team'}
        </SubmitButton>
      </div>
    </form>
  );
}
