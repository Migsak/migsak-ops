import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { requireViewer } from '@/lib/auth';
import { appTimezone } from '@/lib/env';
import { isOverdue } from '@/lib/metrics';
import { getTask, listComments, listProfiles, listTeams } from '@/lib/queries';
import { formatDateKey, formatDateTime, todayKey } from '@/lib/time';
import { deleteTask } from '@/app/actions/admin';
import { Avatar, Button, Card, CardBody, CardHeader, EmptyState } from '@/components/ui';
import { PriorityBadge, StatusBadge } from '@/components/work/TaskBadges';
import { MemberTaskForm } from '@/components/work/MemberTaskForm';
import { TaskForm } from '@/components/work/TaskForm';
import { CommentForm } from '@/components/work/CommentForm';
import { LiveRefresh } from '@/components/live/LiveRefresh';
import { ReviewActions } from './ReviewActions';

export const metadata: Metadata = { title: 'Task' };

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const viewer = await requireViewer();
  const tz = appTimezone();
  const today = todayKey(tz);

  const [task, comments, people, teams] = await Promise.all([getTask(id), listComments(id), listProfiles(), viewer.isAdmin ? listTeams() : Promise.resolve([])]);
  if (!task) notFound();

  const peopleMap = new Map(people.map((p) => [p.id, p]));
  const assignee = task.assignee_id ? peopleMap.get(task.assignee_id) : undefined;
  const creator = task.created_by ? peopleMap.get(task.created_by) : undefined;
  const isAssignee = task.assignee_id === viewer.userId;
  const overdue = isOverdue(task, today);

  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        <Link href={viewer.isAdmin ? '/admin/tasks' : '/tasks'} className="text-xs text-ink-muted hover:text-ink">
          Back to tasks
        </Link>
        <LiveRefresh tables={['tasks', 'task_comments']} />
      </div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-ink">{task.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          {task.due_date ? (
            <span className={overdue ? 'font-medium text-red-600' : undefined}>
              {overdue ? 'Overdue, was due ' : 'Due '}
              {formatDateKey(task.due_date, { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          ) : null}
          {creator ? <span>Created by {creator.full_name}</span> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Details" />
            <CardBody>
              {task.description ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{task.description}</p>
              ) : (
                <p className="text-sm text-ink-muted">No description.</p>
              )}
            </CardBody>
          </Card>

          {task.submission_url || task.submission_note ? (
            <Card>
              <CardHeader
                title="Submission"
                description={task.submitted_at ? `Sent for review ${formatDateTime(task.submitted_at, tz)}` : undefined}
                action={viewer.isAdmin && task.status === 'review' ? <ReviewActions taskId={task.id} /> : undefined}
              />
              <CardBody className="space-y-2">
                {task.submission_url ? (
                  <a href={task.submission_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 break-all text-sm text-brand-600 hover:underline">
                    {task.submission_url}
                    <ExternalLink size={13} aria-hidden="true" />
                  </a>
                ) : null}
                {task.submission_note ? <p className="whitespace-pre-wrap text-sm text-ink">{task.submission_note}</p> : null}
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Discussion" description={`${comments.length} ${comments.length === 1 ? 'comment' : 'comments'}`} />
            {comments.length === 0 ? (
              <EmptyState title="No comments yet" description="Questions and updates about this task go here." />
            ) : (
              <ul className="divide-y divide-line">
                {comments.map((c) => {
                  const author = c.author_id ? peopleMap.get(c.author_id) : undefined;
                  return (
                    <li key={c.id} className="flex gap-3 px-5 py-4">
                      <Avatar name={author?.full_name ?? 'Former member'} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs">
                          <span className="font-medium text-ink">{author?.full_name ?? 'Former member'}</span>
                          <span className="text-ink-muted"> · {formatDateTime(c.created_at, tz)}</span>
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{c.body}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="border-t border-line px-5 py-4">
              <CommentForm taskId={task.id} />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Assignee" />
            <CardBody>
              {assignee ? (
                <div className="flex items-center gap-3">
                  <Avatar name={assignee.full_name} />
                  <div>
                    <p className="text-sm font-medium text-ink">{assignee.full_name}</p>
                    <p className="text-xs text-ink-muted">{assignee.job_title ?? (assignee.member_type === 'intern' ? 'Intern' : 'Employee')}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-ink-muted">Unassigned</p>
              )}
            </CardBody>
          </Card>

          {isAssignee && !viewer.isAdmin ? (
            <Card>
              <CardHeader title="Update this task" />
              <CardBody>
                <MemberTaskForm task={task} />
              </CardBody>
            </Card>
          ) : null}

          {viewer.isAdmin ? (
            <>
              <Card>
                <CardHeader title="Edit task" />
                <CardBody>
                  <TaskForm task={task} people={people} teams={teams} />
                </CardBody>
              </Card>
              <form action={deleteTask}>
                <input type="hidden" name="id" value={task.id} />
                <Button type="submit" variant="danger" size="sm" className="w-full">
                  Delete task
                </Button>
              </form>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
