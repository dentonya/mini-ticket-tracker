import { TICKET_STATUSES, type TicketStatus } from '@mtt/shared';
import { useSearchParams } from 'react-router';
import { useTicketStats } from '../api/tickets';
import { STATUS_META } from '../lib/ticket-meta';

const isStatus = (value: string | null): value is TicketStatus =>
  TICKET_STATUSES.includes(value as TicketStatus);

/**
 * The `?status=` filter, read from and written to the URL so filtered views are linkable and
 * survive a refresh. Changing the filter drops any other params (e.g. page) on purpose.
 */
export function useStatusFilter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get('status');
  const status = isStatus(raw) ? raw : undefined;
  const setStatus = (next: TicketStatus | undefined) =>
    setSearchParams(next ? { status: next } : {});
  return [status, setStatus] as const;
}

interface StatusFilterProps {
  value: TicketStatus | undefined;
  onChange: (status: TicketStatus | undefined) => void;
}

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  const stats = useTicketStats();
  const options: { value: TicketStatus | undefined; label: string; count?: number }[] = [
    { value: undefined, label: 'All', count: stats.data?.total },
    ...TICKET_STATUSES.map((s) => ({
      value: s,
      label: STATUS_META[s].label,
      count: stats.data?.byStatus[s],
    })),
  ];

  return (
    <div role="group" aria-label="Filter by status" className="mb-4 flex flex-wrap gap-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.label}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`flex items-center gap-2 rounded px-3 py-1.5 text-body-sm transition-colors ${
              active
                ? 'bg-surface-high font-medium text-on-surface'
                : 'text-outline hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            {option.value && (
              <span
                className={`h-2 w-2 rounded-full ${STATUS_META[option.value].dot}`}
                aria-hidden="true"
              />
            )}
            {option.label}
            {option.count !== undefined && (
              <span className="font-mono text-mono-sm text-outline">{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
