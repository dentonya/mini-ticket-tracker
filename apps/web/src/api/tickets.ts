import {
  TICKET_STATUSES,
  type CreateTicketRequest,
  type ListTicketsQuery,
  type PaginatedResponse,
  type Ticket,
  type TicketStats,
  type UpdateTicketRequest,
} from '@mtt/shared';
import {
  keepPreviousData,
  type InfiniteData,
  type QueryClient,
  type QueryKey,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { apiRequest } from './client';

const ticketKeys = {
  all: ['tickets'] as const,
  list: (query: ListTicketsQuery) => [...ticketKeys.all, 'list', query] as const,
  column: (status: Ticket['status']) => [...ticketKeys.all, 'column', status] as const,
  stats: () => [...ticketKeys.all, 'stats'] as const,
};

function toSearchParams(query: ListTicketsQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

const listTickets = (query: ListTicketsQuery) =>
  apiRequest<PaginatedResponse<Ticket>>(`/tickets${toSearchParams(query)}`);

export function useTickets(query: ListTicketsQuery) {
  return useQuery({
    queryKey: ticketKeys.list(query),
    queryFn: () => listTickets(query),
    // Keep the current page on screen while the next one loads, instead of flashing empty.
    placeholderData: keepPreviousData,
  });
}

/** One board column: tickets of a single status, fetched page by page via "Load more". */
export function useTicketColumn(status: Ticket['status'], limit = 20) {
  return useInfiniteQuery({
    queryKey: ticketKeys.column(status),
    queryFn: ({ pageParam }) => listTickets({ status, page: pageParam, limit }),
    initialPageParam: 1,
    getNextPageParam: ({ meta }) => (meta.page < meta.totalPages ? meta.page + 1 : undefined),
  });
}

export function useTicketStats() {
  return useQuery({
    queryKey: ticketKeys.stats(),
    queryFn: () => apiRequest<TicketStats>('/tickets/stats'),
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTicketRequest) =>
      apiRequest<Ticket>('/tickets', { method: 'POST', body: JSON.stringify(body) }),
    // Any list, column or stat may now be stale; the dataset is small, so refetch them all.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ticketKeys.all }),
  });
}

type TicketPage = PaginatedResponse<Ticket>;

const newestFirst = (a: Ticket, b: Ticket) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id;

/**
 * Applies an update to every cached view of the ticket so the UI reacts instantly (a dragged
 * card lands in its new column before the server answers). Lists are patched in place, board
 * columns move the card between statuses, and stats shift a count. The server response then
 * replaces all of this via invalidation.
 */
function applyOptimisticUpdate(queryClient: QueryClient, id: number, changes: UpdateTicketRequest) {
  // Only list and column caches hold tickets (the stats cache does not), so read those two.
  const lists = queryClient.getQueriesData<TicketPage>({ queryKey: [...ticketKeys.all, 'list'] });
  const columns = queryClient.getQueriesData<InfiniteData<TicketPage>>({
    queryKey: [...ticketKeys.all, 'column'],
  });
  const current = [
    ...lists.flatMap(([, data]) => data?.data ?? []),
    ...columns.flatMap(([, data]) => data?.pages.flatMap((page) => page.data) ?? []),
  ].find((t) => t.id === id);
  if (!current) return;
  const { description, ...rest } = changes;
  const updated: Ticket = {
    ...current,
    ...rest,
    // Mirror the API: an empty description clears it.
    ...(description !== undefined && { description: description || null }),
  };
  const statusChanged = changes.status !== undefined && changes.status !== current.status;

  queryClient.setQueriesData<TicketPage>(
    { queryKey: [...ticketKeys.all, 'list'] },
    (data) => data && { ...data, data: data.data.map((t) => (t.id === id ? updated : t)) },
  );

  for (const status of TICKET_STATUSES) {
    queryClient.setQueryData<InfiniteData<TicketPage>>(ticketKeys.column(status), (data) => {
      if (!data) return data;
      const pages = data.pages.map((page) => ({
        ...page,
        data: page.data.filter((t) => t.id !== id),
      }));
      if (updated.status === status && pages[0]) {
        pages[0] = { ...pages[0], data: [...pages[0].data, updated].sort(newestFirst) };
      }
      return { ...data, pages };
    });
  }

  if (statusChanged) {
    queryClient.setQueryData<TicketStats>(
      ticketKeys.stats(),
      (stats) =>
        stats && {
          ...stats,
          byStatus: {
            ...stats.byStatus,
            [current.status]: stats.byStatus[current.status] - 1,
            [updated.status]: stats.byStatus[updated.status] + 1,
          },
        },
    );
  }
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateTicketRequest & { id: number }) =>
      apiRequest<Ticket>(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onMutate: async ({ id, ...changes }) => {
      // Stop in-flight fetches from overwriting the optimistic state when they resolve.
      await queryClient.cancelQueries({ queryKey: ticketKeys.all });
      const snapshot: [QueryKey, unknown][] = queryClient.getQueriesData({
        queryKey: ticketKeys.all,
      });
      applyOptimisticUpdate(queryClient, id, changes);
      return { snapshot };
    },
    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.snapshot ?? []) queryClient.setQueryData(key, data);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ticketKeys.all }),
  });
}

export function useDeleteTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiRequest<void>(`/tickets/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ticketKeys.all }),
  });
}
