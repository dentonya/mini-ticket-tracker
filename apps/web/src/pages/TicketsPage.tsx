import { PAGINATION_DEFAULT_LIMIT, type Ticket } from '@mtt/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useTickets } from '../api/tickets';
import { NewTicketButton, PageHeader } from '../components/Layout';
import { EmptyState, ErrorState, SkeletonRows } from '../components/States';
import { StatusFilter, useStatusFilter } from '../components/StatusFilter';
import { TicketDrawer } from '../components/TicketDrawer';
import { TicketFieldSelect } from '../components/TicketFieldSelect';
import { STATUS_META, ticketKey, timeAgo } from '../lib/ticket-meta';

export function TicketsPage() {
  // Filter and page live in the URL so views are linkable and survive a refresh.
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setFilter] = useStatusFilter();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const tickets = useTickets({ status, page, limit: PAGINATION_DEFAULT_LIMIT });
  const [selected, setSelected] = useState<Ticket | null>(null);

  const setPage = (next: number) =>
    setSearchParams({ ...(status && { status }), page: String(next) });

  const meta = tickets.data?.meta;

  return (
    <>
      <PageHeader
        eyebrow="Workspace / All Tickets"
        title="All Tickets"
        description="Filter by status, page through results, and update tickets inline."
        actions={<NewTicketButton />}
      />

      <StatusFilter value={status} onChange={setFilter} />

      {tickets.isPending ? (
        <SkeletonRows count={5} />
      ) : tickets.isError ? (
        <ErrorState error={tickets.error} onRetry={() => void tickets.refetch()} />
      ) : tickets.data.data.length === 0 ? (
        <div className="card">
          <EmptyState
            title={
              status ? `No ${STATUS_META[status].label.toLowerCase()} tickets` : 'No tickets yet'
            }
          >
            {!status && <NewTicketButton />}
          </EmptyState>
        </div>
      ) : (
        <div className={`card overflow-x-auto ${tickets.isPlaceholderData ? 'opacity-60' : ''}`}>
          <table className="w-full min-w-[640px] text-left">
            <thead className="border-b border-white/5 font-mono text-label-xs uppercase text-outline">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">
                  ID
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Title
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Priority
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {tickets.data.data.map((ticket) => (
                <tr
                  key={ticket.id}
                  className="border-b border-white/[0.04] last:border-0 hover:bg-surface-container"
                >
                  <td className="px-4 py-2 font-mono text-mono-sm text-outline">
                    {ticketKey(ticket.id)}
                  </td>
                  <td className="max-w-md px-4 py-2">
                    <button
                      type="button"
                      onClick={() => setSelected(ticket)}
                      className="truncate text-left hover:text-primary hover:underline"
                    >
                      {ticket.title}
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <TicketFieldSelect ticket={ticket} field="status" />
                  </td>
                  <td className="px-4 py-2">
                    <TicketFieldSelect ticket={ticket} field="priority" />
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 font-mono text-mono-sm text-outline">
                    <time dateTime={ticket.createdAt}>{timeAgo(ticket.createdAt)}</time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="mt-4 flex items-center justify-between text-body-sm text-outline"
        >
          <span className="font-mono text-mono-sm">
            Page {meta.page} of {meta.totalPages} · {meta.total} tickets
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-ghost"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
            </button>
            <button
              type="button"
              className="btn-ghost"
              disabled={page >= meta.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </nav>
      )}

      <TicketDrawer ticket={selected} onClose={() => setSelected(null)} />
    </>
  );
}
