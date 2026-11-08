'use client';

import { useActionState } from 'react';
import { updateMyTask } from '@/app/actions/work';
import { initialActionState } from '@/lib/action-state';
import type { Task } from '@/lib/types';
import { Field } from '@/components/ui';
import { FormStatus } from '@/components/forms/FormStatus';
import { SubmitButton } from '@/components/forms/SubmitButton';

/** Lets the assignee move their task along and attach their work for review. */
export function MemberTaskForm({ task }: { task: Task }) {
  const [state, action] = useActionState(updateMyTask, initialActionState);
  const e = state.fieldErrors ?? {};
  const current = task.status === 'done' ? 'review' : task.status;
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="task_id" value={task.id} />
      <FormStatus state={state} />
      <Field label="Status" htmlFor="status" hint="Only your admin can mark a task as done." error={e.status}>
        <select id="status" name="status" defaultValue={current} className="field-input" disabled={task.status === 'done'}>
          <option value="todo">To do</option>
          <option value="in_progress">In progress</option>
          <option value="review">Ready for review</option>
        </select>
      </Field>
      <Field label="Link to your work" htmlFor="submission_url" hint="Pull request, deployed link, design or document." error={e.submission_url}>
        <input
          id="submission_url"
          name="submission_url"
          type="url"
          defaultValue={task.submission_url ?? ''}
          placeholder="https://github.com/..."
          className="field-input"
          disabled={task.status === 'done'}
        />
      </Field>
      <Field label="Note for the reviewer" htmlFor="submission_note" error={e.submission_note}>
        <textarea
          id="submission_note"
          name="submission_note"
          rows={3}
          maxLength={2000}
          defaultValue={task.submission_note ?? ''}
          className="field-input"
          disabled={task.status === 'done'}
        />
      </Field>
      {task.status === 'done' ? null : (
        <div className="flex justify-end">
          <SubmitButton pendingLabel="Saving...">Save</SubmitButton>
        </div>
      )}
    </form>
  );
}
