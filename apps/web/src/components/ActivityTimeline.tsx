import type { TicketEvent, TicketEventType } from '@mtt/shared';
import { ArrowRight, Pencil, Plus, Trash2, type LucideIcon } from 'lucide-react';
import { describeEvent } from '../lib/activity';
import { formatDateTime, ticketKey, timeAgo } from '../lib/ticket-meta';

const EVENT_ICON: Record<TicketEventType, { icon: LucideIcon; tone: string }> = {
  created: { icon: Plus, tone: 'bg-emerald-500/15 text-emerald-300' },
  updated: { icon: Pencil, tone: 'bg-indigo-500/15 text-indigo-300' },
  deleted: { icon: Trash2, tone: 'bg-red-500/15 text-red-300' },
};

interface ActivityTimelineProps {
  events: TicketEvent[];
  /** Show which ticket each event belongs to (for the cross-ticket feed). */
  showTicket?: boolean;
  /** Called when a ticket reference is clicked; omit to render references as plain text. */
  onOpenTicket?: (ticketId: number) => void;
}

export function ActivityTimeline({
  events,
  showTicket = false,
  onOpenTicket,
}: ActivityTimelineProps) {
  return (
    <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-px before:bg-white/10">
      {events.map((event) => {
        const { icon: Icon, tone } = EVENT_ICON[event.type];
        return (
          <li key={event.id} className="relative flex gap-3">
            <span
              className={`relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full ring-4 ring-surface-low ${tone}`}
              aria-hidden="true"
            >
              <Icon className="h-3 w-3" />
            </span>
            <div className="min-w-0 flex-1 space-y-1 pt-0.5">
              {showTicket && <TicketReference event={event} onOpenTicket={onOpenTicket} />}
              <ul className="space-y-1">
                {describeEvent(event).map((line, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-1.5 text-body-md">
                    <span className="text-on-surface-variant">{line.text}</span>
                    {line.from !== undefined && (
                      <>
                        <Chip muted>{line.from}</Chip>
                        <ArrowRight className="h-3 w-3 text-outline" aria-label="to" />
                      </>
                    )}
                    {line.to !== undefined && <Chip>{line.to}</Chip>}
                  </li>
                ))}
              </ul>
              <time
                dateTime={event.createdAt}
                title={formatDateTime(event.createdAt)}
                className="block font-mono text-mono-sm text-outline"
              >
                {timeAgo(event.createdAt)}
              </time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Chip({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span
      className={`max-w-full truncate rounded bg-surface-high px-1.5 font-mono text-mono-sm ${
        muted ? 'text-outline line-through decoration-white/20' : 'text-on-surface'
      }`}
    >
      {children}
    </span>
  );
}

function TicketReference({
  event,
  onOpenTicket,
}: {
  event: TicketEvent;
  onOpenTicket?: (ticketId: number) => void;
}) {
  const label = (
    <>
      <span className="font-mono text-mono-sm text-outline">{ticketKey(event.ticketId)}</span>{' '}
      <span className="font-medium text-on-surface">{event.ticketTitle}</span>
    </>
  );
  // A deleted ticket can no longer be opened.
  if (!onOpenTicket || event.type === 'deleted') return <p className="truncate">{label}</p>;
  return (
    <button
      type="button"
      onClick={() => onOpenTicket(event.ticketId)}
      className="block max-w-full truncate text-left hover:underline"
    >
      {label}
    </button>
  );
}
