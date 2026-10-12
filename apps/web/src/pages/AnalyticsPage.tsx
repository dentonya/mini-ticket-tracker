import { TICKET_STATUSES, type TicketStats } from '@mtt/shared';
import { CheckCircle2, CircleDot, Inbox, Loader } from 'lucide-react';
import { useTicketStats } from '../api/tickets';
import { PageHeader } from '../components/Layout';
import { ErrorState, SkeletonRows } from '../components/States';
import { STATUS_META } from '../lib/ticket-meta';

// SVG stroke colours matching each status's Tailwind dot colour.
const STATUS_STROKE = { open: '#908fa0', in_progress: '#8083ff', closed: '#4edea3' } as const;

export function AnalyticsPage() {
  const stats = useTicketStats();

  return (
    <>
      <PageHeader
        eyebrow="Workspace / Analytics"
        title="Ticket Analytics"
        description="Ticket counts grouped by status, from GET /tickets/stats."
      />
      {stats.isPending ? (
        <SkeletonRows count={2} />
      ) : stats.isError ? (
        <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />
      ) : (
        <AnalyticsContent stats={stats.data} />
      )}
    </>
  );
}

function AnalyticsContent({ stats }: { stats: TicketStats }) {
  const { total, byStatus } = stats;
  const share = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

  const cards = [
    { label: 'Total tickets', value: total, icon: Inbox, accent: 'text-primary', note: 'All time' },
    {
      label: 'Open',
      value: byStatus.open,
      icon: CircleDot,
      accent: 'text-outline',
      note: `${share(byStatus.open)}% of total`,
    },
    {
      label: 'In progress',
      value: byStatus.in_progress,
      icon: Loader,
      accent: 'text-primary-container',
      note: `${share(byStatus.in_progress)}% of total`,
    },
    {
      label: 'Closed',
      value: byStatus.closed,
      icon: CheckCircle2,
      accent: 'text-secondary',
      note: `${share(byStatus.closed)}% resolution rate`,
    },
  ];

  return (
    <div className="space-y-6">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, accent, note }) => (
          <li key={label} className="card p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-mono-sm uppercase tracking-wider text-outline">
                {label}
              </span>
              <Icon className={`h-4 w-4 ${accent}`} aria-hidden="true" />
            </div>
            <p className="mt-2 text-headline-xl tabular-nums">{value}</p>
            <p className="font-mono text-mono-sm text-outline">{note}</p>
          </li>
        ))}
      </ul>

      <section
        className="card grid items-center gap-6 p-6 md:grid-cols-2"
        aria-labelledby="breakdown-title"
      >
        <div>
          <h2 id="breakdown-title" className="text-headline-sm">
            Status breakdown
          </h2>
          <p className="mb-4 text-body-sm text-outline">
            Distribution of all tickets by workflow state
          </p>
          <ul className="space-y-2">
            {TICKET_STATUSES.map((status) => (
              <li
                key={status}
                className="flex items-center justify-between rounded bg-surface-container px-3 py-2"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${STATUS_META[status].dot}`}
                    aria-hidden="true"
                  />
                  {STATUS_META[status].label}
                </span>
                <span className="font-mono text-mono-sm tabular-nums">
                  {byStatus[status]}{' '}
                  <span className="text-outline">({share(byStatus[status])}%)</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <Donut stats={stats} />
      </section>
    </div>
  );
}

function Donut({ stats }: { stats: TicketStats }) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <figure className="relative mx-auto h-48 w-48">
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#2d3449" strokeWidth="18" />
        {stats.total > 0 &&
          TICKET_STATUSES.map((status) => {
            const length = (stats.byStatus[status] / stats.total) * circumference;
            const segment = (
              <circle
                key={status}
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke={STATUS_STROKE[status]}
                strokeWidth="18"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
              />
            );
            offset += length;
            return segment;
          })}
      </svg>
      <figcaption className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-headline-xl tabular-nums">{stats.total}</span>
        <span className="font-mono text-label-xs uppercase text-outline">Tickets</span>
      </figcaption>
    </figure>
  );
}
