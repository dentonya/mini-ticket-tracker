import { TICKET_STATUSES, type TicketStats } from '@mtt/shared';
import { STATUS_META } from '../lib/ticket-meta';

/** Segmented progress bar from the board mockup, driven by GET /tickets/stats. */
export function ProgressSummary({ stats }: { stats: TicketStats }) {
  const { total, byStatus } = stats;
  const percent = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
  // Bar order: done first, then in-flight work, then untouched.
  const segments = [...TICKET_STATUSES].reverse();

  return (
    <section className="card mb-6 space-y-2 p-4" aria-label="Progress">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p>
          <span className="text-headline-sm">{percent(byStatus.closed)}% Completed</span>{' '}
          <span className="font-mono text-mono-sm text-outline">
            ({byStatus.closed} of {total} tickets closed)
          </span>
        </p>
        <p className="font-mono text-mono-sm text-secondary">
          {total - byStatus.closed} tickets remaining
        </p>
      </div>
      <div
        className="flex h-2 w-full overflow-hidden rounded-full bg-surface-highest"
        aria-hidden="true"
      >
        {segments.map((status) => (
          <div
            key={status}
            className={`h-full transition-all ${STATUS_META[status].dot}`}
            style={{ width: `${percent(byStatus[status])}%` }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-outline">
        {segments.map((status) => (
          <li key={status} className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${STATUS_META[status].dot}`}
              aria-hidden="true"
            />
            {STATUS_META[status].label} ({byStatus[status]})
          </li>
        ))}
      </ul>
    </section>
  );
}
