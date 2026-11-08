'use client';

import { useActionState } from 'react';
import { saveTask } from '@/app/actions/admin';
import { initialActionState } from '@/lib/action-state';
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS, TASK_STATUSES, TASK_STATUS_LABELS, type Profile, type Task, type Team } from '@/lib/types';
import { Field } from '@/components/ui';
import { FormStatus } from '@/components/forms/FormStatus';
import { SubmitButton } from '@/components/forms/SubmitButton';

/** Admin create/edit form for a task. */
export function TaskForm({ task, people, teams }: { task?: Task; people: Profile[]; teams: Team[] }) {
  const [state, action] = useActionState(saveTask, initialActionState);
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      {task ? <input type="hidden" name="id" value={task.id} /> : null}
      <FormStatus state={state} />
      <Field label="Title" htmlFor="title" error={e.title}>
        <input id="title" name="title" required maxLength={200} defaultValue={task?.title} className="field-input" />
      </Field>
      <Field label="Description" htmlFor="description" hint="What done looks like, links and any constraints." error={e.description}>
        <textarea id="description" name="description" rows={6} maxLength={8000} defaultValue={task?.description ?? ''} className="field-input" />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Assignee" htmlFor="assignee_id" error={e.assignee_id}>
          <select id="assignee_id" name="assignee_id" defaultValue={task?.assignee_id ?? ''} className="field-input">
            <option value="">Unassigned</option>
            {people
              .filter((p) => p.status === 'active')
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Team" htmlFor="team_id" hint="Defaults to the assignee's team." error={e.team_id}>
          <select id="team_id" name="team_id" defaultValue={task?.team_id ?? ''} className="field-input">
            <option value="">Same as assignee</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Priority" htmlFor="priority" error={e.priority}>
          <select id="priority" name="priority" defaultValue={task?.priority ?? 'medium'} className="field-input">
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {TASK_PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Due date" htmlFor="due_date" error={e.due_date}>
          <input id="due_date" name="due_date" type="date" defaultValue={task?.due_date ?? ''} className="field-input" />
        </Field>
        {task ? (
          <Field label="Status" htmlFor="status" error={e.status}>
            <select id="status" name="status" defaultValue={task.status} className="field-input">
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {TASK_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving...">{task ? 'Save changes' : 'Create task'}</SubmitButton>
      </div>
    </form>
  );
}
