import type { TicketPriority, TicketStatus } from '@mtt/shared';
import { PRIORITY_META, STATUS_META } from '../lib/ticket-meta';

const pillBase =
  'inline-flex h-5 items-center gap-1.5 rounded-full px-2 font-mono text-mono-sm ring-1 ring-inset';

export function StatusBadge({ status }: { status: TicketStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={`${pillBase} ${meta.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const meta = PRIORITY_META[priority];
  return (
    <span className={`${pillBase} ${meta.pill}`} title={`${meta.label} priority`}>
      {meta.label}
    </span>
  );
}
