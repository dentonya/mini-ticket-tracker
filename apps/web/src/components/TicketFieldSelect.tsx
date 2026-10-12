import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type Ticket,
  type TicketPriority,
  type TicketStatus,
} from '@mtt/shared';
import { useUpdateTicket } from '../api/tickets';
import { PRIORITY_META, STATUS_META, ticketKey } from '../lib/ticket-meta';

type Field = 'status' | 'priority';

const OPTIONS = {
  status: TICKET_STATUSES.map((value) => ({ value, label: STATUS_META[value].label })),
  priority: TICKET_PRIORITIES.map((value) => ({ value, label: PRIORITY_META[value].label })),
} satisfies Record<Field, { value: string; label: string }[]>;

interface TicketFieldSelectProps {
  ticket: Ticket;
  field: Field;
  onUpdated?: (ticket: Ticket) => void;
  className?: string;
}

/** Inline editor for a ticket's status or priority; persists immediately on change. */
export function TicketFieldSelect({
  ticket,
  field,
  onUpdated,
  className = '',
}: TicketFieldSelectProps) {
  const update = useUpdateTicket();
  const value = (update.isPending && update.variables[field]) || ticket[field];

  return (
    <span className="inline-flex flex-col">
      <select
        aria-label={`Change ${field} of ${ticketKey(ticket.id)}`}
        value={value}
        disabled={update.isPending}
        aria-invalid={update.isError || undefined}
        onChange={(event) =>
          update.mutate(
            { id: ticket.id, [field]: event.target.value as TicketStatus & TicketPriority },
            { onSuccess: onUpdated },
          )
        }
        className={`cursor-pointer rounded border border-white/10 bg-surface-high py-1 pl-2 pr-7 text-body-sm text-on-surface outline-none transition-colors hover:bg-surface-highest focus:border-primary-container disabled:cursor-wait disabled:opacity-60 aria-[invalid=true]:border-error/70 ${className}`}
      >
        {OPTIONS[field].map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {update.isError && (
        <span role="alert" className="mt-1 text-body-sm text-error">
          Couldn't save — {update.error.message}
        </span>
      )}
    </span>
  );
}
