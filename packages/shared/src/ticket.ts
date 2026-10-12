/**
 * Ticket domain contracts. This is the single source of truth for enum values and
 * API payload shapes; both the NestJS API and the React client import from here so
 * the two sides cannot drift apart.
 */

export const TICKET_STATUSES = ['open', 'in_progress', 'closed'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ['low', 'medium', 'high'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_TITLE_MAX_LENGTH = 120;
export const TICKET_DESCRIPTION_MAX_LENGTH = 5000;

export const PAGINATION_DEFAULT_LIMIT = 20;
export const PAGINATION_MAX_LIMIT = 100;

/** A ticket as returned by the API. Dates are ISO-8601 strings on the wire. */
export interface Ticket {
  id: number;
  title: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
}

/** New tickets always start as `open`; status changes go through UpdateTicketRequest. */
export interface CreateTicketRequest {
  title: string;
  description?: string;
  priority?: TicketPriority;
}

/** Partial update: send only the fields to change. An empty description clears it. */
export interface UpdateTicketRequest {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
}

export interface ListTicketsQuery {
  status?: TicketStatus;
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface TicketStats {
  total: number;
  byStatus: Record<TicketStatus, number>;
}

/** Error body produced by the API for any non-2xx response. */
export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
}

/* ---------------------------------------------------------------- Activity log --- */

export const TICKET_EVENT_TYPES = ['created', 'updated', 'deleted'] as const;
export type TicketEventType = (typeof TICKET_EVENT_TYPES)[number];

/** Fields whose changes are recorded in the activity log. */
export type TrackedTicketField = 'title' | 'description' | 'status' | 'priority';

/**
 * Old and new value of each field that changed. `from` is null on creation; only fields
 * that actually changed are present.
 */
export type TicketChanges = {
  [K in TrackedTicketField]?: { from: Ticket[K] | null; to: Ticket[K] };
};

/** One entry in the activity log. Entries outlive their ticket, so the title is a snapshot. */
export interface TicketEvent {
  id: number;
  ticketId: number;
  ticketTitle: string;
  type: TicketEventType;
  changes: TicketChanges;
  createdAt: string;
}

export interface ListActivityQuery {
  ticketId?: number;
  page?: number;
  limit?: number;
}
