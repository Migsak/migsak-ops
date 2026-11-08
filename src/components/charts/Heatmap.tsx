import clsx from 'clsx';
import { formatDateKey, formatMinutes } from '@/lib/time';

export interface HeatRow {
  id: string;
  name: string;
  cells: { date: string; minutes: number; target: number; level: number }[];
}

const LEVEL_CLASSES: Record<number, string> = {
  [-1]: 'bg-gray-50',
  0: 'bg-red-50 ring-1 ring-inset ring-red-100',
  1: 'bg-brand-100',
  2: 'bg-brand-200',
  3: 'bg-[#669DF6]',
  4: 'bg-brand-500'
};

/** People by days grid. Colour shows how much of the day's target was met. */
export function AttendanceHeatmap({ rows, days }: { rows: HeatRow[]; days: string[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 bg-white pr-3 text-left font-medium text-ink-muted" scope="col">
              Person
            </th>
            {days.map((d) => (
              <th key={d} scope="col" className="w-6 text-center font-normal text-ink-subtle">
                {formatDateKey(d, { day: 'numeric' })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row" className="sticky left-0 max-w-[140px] truncate bg-white pr-3 text-left font-medium text-ink">
                {row.name}
              </th>
              {row.cells.map((c) => (
                <td key={c.date} className="p-0">
                  <div
                    className={clsx('h-6 w-6 rounded', LEVEL_CLASSES[c.level] ?? 'bg-gray-50')}
                    title={`${formatDateKey(c.date, { weekday: 'short', day: 'numeric', month: 'short' })}: ${formatMinutes(c.minutes)}${c.target ? ` of ${formatMinutes(c.target)}` : ''}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-ink-muted">
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-red-50 ring-1 ring-inset ring-red-100" />No hours</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-brand-100" />Under a third</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-brand-200" />Under two thirds</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-[#669DF6]" />Nearly there</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-brand-500" />Target met</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-gray-50 ring-1 ring-inset ring-line" />No target</span>
      </div>
    </div>
  );
}
