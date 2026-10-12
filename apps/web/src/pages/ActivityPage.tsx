import { PAGINATION_DEFAULT_LIMIT } from '@mtt/shared';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useActivity, useTicket } from '../api/tickets';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { PageHeader } from '../components/Layout';
import { Pagination } from '../components/Pagination';
import { EmptyState, ErrorState, SkeletonRows } from '../components/States';
import { TicketDrawer } from '../components/TicketDrawer';
import { ticketKey } from '../lib/ticket-meta';

export function ActivityPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const activity = useActivity({ page, limit: PAGINATION_DEFAULT_LIMIT });

  // Events carry only a ticket id, so the drawer fetches the current ticket on demand.
  const [openTicketId, setOpenTicketId] = useState<number | null>(null);
  const openTicket = useTicket(openTicketId);

  return (
    <>
      <PageHeader
        eyebrow="Workspace / Activity"
        title="Activity"
        description="Every ticket creation, edit and deletion, newest first."
      />

      {openTicket.isError && openTicketId !== null && (
        <p
          role="alert"
          className="mb-4 rounded bg-error-container/30 px-4 py-2 text-body-sm text-error"
        >
          {ticketKey(openTicketId)} can't be opened: {openTicket.error.message}
        </p>
      )}

      {activity.isPending ? (
        <SkeletonRows count={5} />
      ) : activity.isError ? (
        <ErrorState error={activity.error} onRetry={() => void activity.refetch()} />
      ) : activity.data.data.length === 0 ? (
        <div className="card">
          <EmptyState title="No activity yet. Create a ticket to get started." />
        </div>
      ) : (
        <section
          aria-label="Activity log"
          className={`card p-5 ${activity.isPlaceholderData ? 'opacity-60' : ''}`}
        >
          <ActivityTimeline events={activity.data.data} showTicket onOpenTicket={setOpenTicketId} />
        </section>
      )}

      <Pagination
        meta={activity.data?.meta}
        onPageChange={(next) => setSearchParams({ page: String(next) })}
        noun="events"
      />

      <TicketDrawer
        ticket={openTicketId !== null && openTicket.data ? openTicket.data : null}
        onClose={() => setOpenTicketId(null)}
      />
    </>
  );
}
