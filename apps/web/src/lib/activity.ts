import type { TicketChanges, TicketEvent, TicketPriority, TicketStatus } from '@mtt/shared';
import { PRIORITY_META, STATUS_META } from './ticket-meta';

/** A human-readable line describing one part of an event. `from`/`to` are shown as chips. */
export interface ActivityLine {
  text: string;
  from?: string;
  to?: string;
}

const statusLabel = (s: TicketStatus | null) => (s ? STATUS_META[s].label : '—');
const priorityLabel = (p: TicketPriority | null) => (p ? PRIORITY_META[p].label : '—');

function describeChanges(changes: TicketChanges): ActivityLine[] {
  const lines: ActivityLine[] = [];
  if (changes.status) {
    lines.push({
      text: 'Changed status',
      from: statusLabel(changes.status.from),
      to: statusLabel(changes.status.to),
    });
  }
  if (changes.priority) {
    lines.push({
      text: 'Changed priority',
      from: priorityLabel(changes.priority.from),
      to: priorityLabel(changes.priority.to),
    });
  }
  if (changes.title) {
    lines.push({ text: 'Renamed', from: changes.title.from ?? '', to: changes.title.to });
  }
  if (changes.description) {
    const { from, to } = changes.description;
    lines.push({
      text: !to
        ? 'Removed the description'
        : !from
          ? 'Added a description'
          : 'Edited the description',
    });
  }
  return lines;
}

export function describeEvent(event: TicketEvent): ActivityLine[] {
  switch (event.type) {
    case 'created': {
      const { priority } = event.changes;
      return [
        {
          text: 'Created the ticket',
          to: priority ? `${priorityLabel(priority.to)} priority` : undefined,
        },
      ];
    }
    case 'deleted':
      return [{ text: 'Deleted the ticket' }];
    case 'updated':
      return describeChanges(event.changes);
  }
}
