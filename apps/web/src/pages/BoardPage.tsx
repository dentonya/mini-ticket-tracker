import { TICKET_STATUSES, type Ticket, type TicketStatus } from '@mtt/shared';
import { GripVertical } from 'lucide-react';
import { useState } from 'react';
import { useTicketColumn, useTicketStats, useUpdateTicket } from '../api/tickets';
import { PriorityBadge } from '../components/Badges';
import { NewTicketButton, PageHeader } from '../components/Layout';
import { ProgressSummary } from '../components/ProgressSummary';
import { EmptyState, ErrorState, SkeletonRows } from '../components/States';
import { StatusFilter, useStatusFilter } from '../components/StatusFilter';
import { TicketDrawer } from '../components/TicketDrawer';
import { TicketFieldSelect } from '../components/TicketFieldSelect';
import { STATUS_META, ticketKey, timeAgo } from '../lib/ticket-meta';

export function BoardPage() {
  const stats = useTicketStats();
  const [filter, setFilter] = useStatusFilter();
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [dragging, setDragging] = useState<Ticket | null>(null);
  const updateTicket = useUpdateTicket();
  const columns = filter ? [filter] : TICKET_STATUSES;

  return (
    <>
      <PageHeader
        eyebrow="Workspace / Board"
        title="Ticket Board"
        description="Every ticket, grouped by status. Drag a card to another column, or change its status, to move it."
        actions={<NewTicketButton />}
      />
      {stats.data && <ProgressSummary stats={stats.data} />}

      <StatusFilter value={filter} onChange={setFilter} />

      <div className={`grid gap-4 ${filter ? '' : 'md:grid-cols-3'}`}>
        {columns.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            count={stats.data?.byStatus[status]}
            expanded={filter !== undefined}
            onSelect={setSelected}
            dragging={dragging}
            onDragChange={setDragging}
            onDropTicket={(ticket) => updateTicket.mutate({ id: ticket.id, status })}
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
  /** When the board is filtered to this one status, the column spans the page and cards wrap. */
  expanded: boolean;
  onSelect: (ticket: Ticket) => void;
  /** The card currently being dragged anywhere on the board, if any. */
  dragging: Ticket | null;
  onDragChange: (ticket: Ticket | null) => void;
  onDropTicket: (ticket: Ticket) => void;
}

function BoardColumn({
  status,
  count,
  expanded,
  onSelect,
  dragging,
  onDragChange,
  onDropTicket,
}: BoardColumnProps) {
  const column = useTicketColumn(status);
  const tickets = column.data?.pages.flatMap((page) => page.data) ?? [];
  const meta = STATUS_META[status];
  const headingId = `column-${status}`;
  const [isOver, setIsOver] = useState(false);
  const canDrop = dragging !== null && dragging.status !== status;

  const dropHandlers = {
    onDragOver: (event: React.DragEvent) => {
      if (!canDrop) return;
      event.preventDefault(); // Marks this column as a valid drop target.
      event.dataTransfer.dropEffect = 'move';
      setIsOver(true);
    },
    onDragLeave: (event: React.DragEvent) => {
      // Ignore leave events fired when moving between the column's own children.
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsOver(false);
    },
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      setIsOver(false);
      if (dragging && canDrop) onDropTicket(dragging);
      onDragChange(null);
    },
  };

  return (
    <section
      aria-labelledby={headingId}
      {...dropHandlers}
      className={`flex flex-col rounded-lg p-3 ring-2 transition-colors ${
        isOver
          ? 'bg-primary-container/10 ring-primary-container/60'
          : canDrop
            ? 'bg-surface-low/60 ring-white/10'
            : 'bg-surface-low/60 ring-transparent'
      }`}
    >
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
        <ul className={expanded ? 'grid gap-2 sm:grid-cols-2 xl:grid-cols-3' : 'space-y-2'}>
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <TicketCard
                ticket={ticket}
                onSelect={onSelect}
                isDragging={dragging?.id === ticket.id}
                onDragChange={onDragChange}
              />
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

interface TicketCardProps {
  ticket: Ticket;
  onSelect: (ticket: Ticket) => void;
  isDragging: boolean;
  onDragChange: (ticket: Ticket | null) => void;
}

function TicketCard({ ticket, onSelect, isDragging, onDragChange }: TicketCardProps) {
  const closed = ticket.status === 'closed';
  return (
    <article
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', ticketKey(ticket.id));
        // Re-rendering synchronously inside dragstart (dimming this card, highlighting drop
        // targets) makes Chrome abort the drag, so defer the state change by a tick.
        setTimeout(() => onDragChange(ticket));
      }}
      onDragEnd={() => onDragChange(null)}
      // Clicking anywhere on the card opens it; the title button is the keyboard equivalent.
      onClick={(event) => {
        if (!(event.target as HTMLElement).closest('button, select')) onSelect(ticket);
      }}
      className={`group cursor-grab rounded-lg border border-white/5 bg-surface-container p-3 transition-all hover:border-white/10 hover:bg-surface-high active:cursor-grabbing ${
        ticket.priority === 'high' && !closed ? 'border-l-2 border-l-red-400/70' : ''
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 font-mono text-mono-sm text-outline">
          <GripVertical
            className="h-3.5 w-3.5 opacity-40 transition-opacity group-hover:opacity-100"
            aria-hidden="true"
          />
          <span className={closed ? 'line-through' : ''}>{ticketKey(ticket.id)}</span>
        </span>
        <PriorityBadge priority={ticket.priority} />
      </div>
      <h3 className="mb-3 text-body-lg font-medium leading-snug">
        <button
          type="button"
          onClick={() => onSelect(ticket)}
          className="rounded text-left hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
        >
          {ticket.title}
        </button>
      </h3>
      <div className="flex items-center justify-between gap-2">
        <time dateTime={ticket.createdAt} className="font-mono text-mono-sm text-outline">
          {timeAgo(ticket.createdAt)}
        </time>
        <TicketFieldSelect ticket={ticket} field="status" />
      </div>
    </article>
  );
}
