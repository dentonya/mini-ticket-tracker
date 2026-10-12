import type { TicketPriority, TicketStatus } from '@mtt/shared';

/** Display metadata for each enum value; the Tailwind classes follow the design's pill spec. */
export const STATUS_META: Record<TicketStatus, { label: string; dot: string; pill: string }> = {
  open: {
    label: 'Open',
    dot: 'bg-outline',
    pill: 'bg-white/5 text-on-surface-variant ring-white/10',
  },
  in_progress: {
    label: 'In Progress',
    dot: 'bg-primary-container',
    pill: 'bg-indigo-500/10 text-indigo-300 ring-indigo-400/20',
  },
  closed: {
    label: 'Closed',
    dot: 'bg-secondary',
    pill: 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/20',
  },
};

export const PRIORITY_META: Record<TicketPriority, { label: string; pill: string }> = {
  low: { label: 'Low', pill: 'bg-white/5 text-outline ring-white/10' },
  medium: { label: 'Medium', pill: 'bg-amber-500/10 text-amber-300 ring-amber-400/20' },
  high: { label: 'High', pill: 'bg-red-500/10 text-red-300 ring-red-400/20' },
};

export const ticketKey = (id: number) => `TK-${String(id).padStart(3, '0')}`;

const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relativeTime.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
