import type {
  CreateTicketRequest,
  ListTicketsQuery,
  PaginatedResponse,
  Ticket,
  TicketStats,
  UpdateTicketRequest,
} from '@mtt/shared';
import {
  keepPreviousData,
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

export function useUpdateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateTicketRequest & { id: number }) =>
      apiRequest<Ticket>(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ticketKeys.all }),
  });
}
