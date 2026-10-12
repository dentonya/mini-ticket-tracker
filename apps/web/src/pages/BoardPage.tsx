import { TICKET_STATUSES, type Ticket, type TicketStatus } from '@mtt/shared';
import { useState } from 'react';
import { useTicketColumn, useTicketStats } from '../api/tickets';
import { PriorityBadge } from '../components/Badges';
import { NewTicketButton, PageHeader, useLayout } from '../components/Layout';
import { ProgressSummary } from '../components/ProgressSummary';
import { EmptyState, ErrorState, SkeletonRows } from '../components/States';
import { TicketDrawer } from '../components/TicketDrawer';
import { TicketFieldSelect } from '../components/TicketFieldSelect';
import { STATUS_META, ticketKey, timeAgo } from '../lib/ticket-meta';

export function BoardPage() {
  const stats = useTicketStats();
  const [selected, setSelected] = useState<Ticket | null>(null);

  return (
    <>
      <PageHeader
        eyebrow="Workspace / Board"
        title="Ticket Board"
        description="Every ticket, grouped by status. Change a status to move it between columns."
        actions={<NewTicketButton />}
      />
      {stats.data && <ProgressSummary stats={stats.data} />}

      <div className="grid gap-4 md:grid-cols-3">
        {TICKET_STATUSES.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            count={stats.data?.byStatus[status]}
            onSelect={setSelected}
          />
        ))}
      </div>

      <TicketDrawer ticket={selected} onClose={() => setSelected(null)} />
    </>
  );
}

interface BoardColumnProps {
  status: TicketStatus;
  count: number | undefined;
  onSelect: (ticket: Ticket) => void;
}

function BoardColumn({ status, count, onSelect }: BoardColumnProps) {
  const column = useTicketColumn(status);
  const tickets = column.data?.pages.flatMap((page) => page.data) ?? [];
  const meta = STATUS_META[status];
  const headingId = `column-${status}`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col rounded-lg bg-surface-low/60 p-3">
      <header className="mb-3 flex items-center gap-2 px-1">
        <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden="true" />
        <h2 id={headingId} className="text-headline-sm">
          {meta.label}
        </h2>
        {count !== undefined && (
          <span className="rounded bg-surface-highest px-1.5 font-mono text-mono-sm text-on-surface-variant">
            {count}
          </span>
        )}
      </header>

      {column.isPending ? (
        <SkeletonRows />
      ) : column.isError ? (
        <ErrorState error={column.error} onRetry={() => void column.refetch()} />
      ) : tickets.length === 0 ? (
        <EmptyState title={`No ${meta.label.toLowerCase()} tickets`} />
      ) : (
        <ul className="space-y-2">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <TicketCard ticket={ticket} onSelect={onSelect} />
            </li>
          ))}
        </ul>
      )}

      {column.hasNextPage && (
        <button
          type="button"
          className="btn-ghost mt-3 w-full"
          disabled={column.isFetchingNextPage}
          onClick={() => void column.fetchNextPage()}
        >
          {column.isFetchingNextPage ? 'Loading…' : 'Load more'}
        </button>
      )}
    </section>
  );
}

function TicketCard({ ticket, onSelect }: { ticket: Ticket; onSelect: (t: Ticket) => void }) {
  const closed = ticket.status === 'closed';
  return (
    <article
      className={`relative rounded-lg border border-white/5 bg-surface-container p-3 transition-colors hover:border-white/10 hover:bg-surface-high ${
        ticket.priority === 'high' && !closed ? 'border-l-2 border-l-red-400/70' : ''
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className={`font-mono text-mono-sm text-outline ${closed ? 'line-through' : ''}`}>
          {ticketKey(ticket.id)}
        </span>
        <PriorityBadge priority={ticket.priority} />
      </div>
      {/* Stretched button: the whole card opens the drawer, but the select below stays usable. */}
      <h3 className="mb-3 text-body-lg font-medium leading-snug">
        <button
          type="button"
          onClick={() => onSelect(ticket)}
          className="text-left after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary-container"
        >
          {ticket.title}
        </button>
      </h3>
      <div className="relative flex items-center justify-between gap-2">
        <time dateTime={ticket.createdAt} className="font-mono text-mono-sm text-outline">
          {timeAgo(ticket.createdAt)}
        </time>
        <TicketFieldSelect ticket={ticket} field="status" />
      </div>
    </article>
  );
}
