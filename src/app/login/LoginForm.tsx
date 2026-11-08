'use client';

import { useActionState } from 'react';
import { signIn } from '@/app/actions/auth';
import { initialActionState } from '@/lib/action-state';
import { Field } from '@/components/ui';
import { FormStatus } from '@/components/forms/FormStatus';
import { SubmitButton } from '@/components/forms/SubmitButton';

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signIn, initialActionState);
  return (
    <form action={action} className="space-y-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <FormStatus state={state} />
      <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
        <input id="email" name="email" type="email" autoComplete="email" required className="field-input" />
      </Field>
      <Field label="Password" htmlFor="password" error={state.fieldErrors?.password}>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field-input" />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Signing in...">
        Sign in
      </SubmitButton>
    </form>
  );
}
