import { Badge } from '@/components/ui';
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, type TaskPriority, type TaskStatus } from '@/lib/types';

const STATUS_TONES: Record<TaskStatus, 'neutral' | 'blue' | 'amber' | 'green'> = {
  todo: 'neutral',
  in_progress: 'blue',
  review: 'amber',
  done: 'green'
};

const PRIORITY_TONES: Record<TaskPriority, 'neutral' | 'blue' | 'amber' | 'red'> = {
  low: 'neutral',
  medium: 'blue',
  high: 'amber',
  urgent: 'red'
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{TASK_STATUS_LABELS[status]}</Badge>;
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return <Badge tone={PRIORITY_TONES[priority]}>{TASK_PRIORITY_LABELS[priority]}</Badge>;
}
