import { setTaskStatus } from '@/app/actions/admin';
import { Button } from '@/components/ui';

/** Admin approve / send back controls for a task in review. */
export function ReviewActions({ taskId }: { taskId: string }) {
  return (
    <div className="flex gap-2">
      <form action={setTaskStatus}>
        <input type="hidden" name="id" value={taskId} />
        <input type="hidden" name="status" value="in_progress" />
        <Button type="submit" variant="secondary" size="sm">
          Send back
        </Button>
      </form>
      <form action={setTaskStatus}>
        <input type="hidden" name="id" value={taskId} />
        <input type="hidden" name="status" value="done" />
        <Button type="submit" size="sm">
          Approve
        </Button>
      </form>
    </div>
  );
}
