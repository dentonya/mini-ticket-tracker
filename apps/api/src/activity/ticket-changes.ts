import type { TicketChanges, TrackedTicketField } from '@mtt/shared';
import type { Ticket } from '../tickets/ticket.entity';

const TRACKED_FIELDS: readonly TrackedTicketField[] = [
  'title',
  'description',
  'status',
  'priority',
];

type TrackedValues = Partial<Pick<Ticket, TrackedTicketField>>;

/** The fields that differ between `before` and `after`, as from/to pairs. */
export function diffTicket(before: TrackedValues, after: TrackedValues): TicketChanges {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const field of TRACKED_FIELDS) {
    const to = after[field];
    if (to !== undefined && to !== before[field]) {
      changes[field] = { from: before[field] ?? null, to };
    }
  }
  return changes as TicketChanges;
}

/** Every tracked field of a newly created ticket, each with `from: null`. */
export function initialValues(ticket: Ticket): TicketChanges {
  const { description, ...required } = diffTicket({}, ticket);
  return ticket.description === null ? required : { ...required, description };
}
