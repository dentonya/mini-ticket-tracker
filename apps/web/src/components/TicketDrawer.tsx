import type { Ticket } from '@mtt/shared';
import { X } from 'lucide-react';
import { useState } from 'react';
import { formatDateTime, ticketKey, timeAgo } from '../lib/ticket-meta';
import { PriorityBadge, StatusBadge } from './Badges';
import { Dialog } from './Dialog';
import { TicketFieldSelect } from './TicketFieldSelect';

interface TicketDrawerProps {
  ticket: Ticket | null;
  onClose: () => void;
}

export function TicketDrawer({ ticket, onClose }: TicketDrawerProps) {
  return (
    <Dialog
      open={ticket !== null}
      onClose={onClose}
      labelledBy="ticket-drawer-title"
      className="ml-auto mr-0 my-0 h-dvh max-h-dvh w-full max-w-lg rounded-none border-y-0 border-r-0"
    >
      {ticket && <TicketDetail key={ticket.id} initial={ticket} onClose={onClose} />}
    </Dialog>
  );
}

function TicketDetail({ initial, onClose }: { initial: Ticket; onClose: () => void }) {
  // The drawer holds its own copy so edits made here show immediately, without waiting for
  // the parent's list query to refetch.
  const [ticket, setTicket] = useState(initial);

  return (
    <article className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-white/5 px-6 py-3">
        <nav
          className="flex items-center gap-2 font-mono text-mono-sm text-outline"
          aria-label="Breadcrumb"
        >
          <span>Tickets</span>
          <span aria-hidden="true">/</span>
          <span className="text-on-surface">{ticketKey(ticket.id)}</span>
        </nav>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close ticket details"
          className="rounded p-1 text-outline hover:bg-white/5 hover:text-on-surface"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
        <div className="space-y-3">
          <p className="font-mono text-mono-sm text-outline">Created {timeAgo(ticket.createdAt)}</p>
          <h2 id="ticket-drawer-title" className="text-headline-md leading-snug">
            {ticket.title}
          </h2>
          <div className="flex gap-2">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
        </div>

        <section className="card p-4">
          <h3 className="mb-3 text-headline-sm">Properties</h3>
          <dl className="grid grid-cols-[7rem_1fr] items-center gap-y-3 text-body-md">
            <dt className="text-outline">Status</dt>
            <dd>
              <TicketFieldSelect ticket={ticket} field="status" onUpdated={setTicket} />
            </dd>
            <dt className="text-outline">Priority</dt>
            <dd>
              <TicketFieldSelect ticket={ticket} field="priority" onUpdated={setTicket} />
            </dd>
            <dt className="text-outline">Created</dt>
            <dd className="font-mono text-mono-sm">{formatDateTime(ticket.createdAt)}</dd>
          </dl>
        </section>

        <section className="card p-4">
          <h3 className="mb-3 text-headline-sm">Description</h3>
          {ticket.description ? (
            <p className="whitespace-pre-wrap break-words text-on-surface-variant">
              {ticket.description}
            </p>
          ) : (
            <p className="italic text-outline">No description provided.</p>
          )}
        </section>
      </div>
    </article>
  );
}
