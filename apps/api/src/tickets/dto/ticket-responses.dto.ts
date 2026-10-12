import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type ApiErrorBody,
  type PaginatedResponse,
  type PaginationMeta,
  type Ticket,
  type TicketPriority,
  type TicketStats,
  type TicketStatus,
} from '@mtt/shared';
import { ApiProperty } from '@nestjs/swagger';

/*
 * Response shapes for the OpenAPI document only. They implement the shared contracts, so the
 * compiler flags any drift between what the docs describe and what clients are typed against.
 */

export class TicketResponseDto implements Ticket {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Login page returns 500' })
  title: string;

  @ApiProperty({ type: String, nullable: true, example: 'Started after the 14:00 deploy.' })
  description: string | null;

  @ApiProperty({ enum: TICKET_STATUSES, enumName: 'TicketStatus', example: 'open' })
  status: TicketStatus;

  @ApiProperty({ enum: TICKET_PRIORITIES, enumName: 'TicketPriority', example: 'high' })
  priority: TicketPriority;

  @ApiProperty({ format: 'date-time', example: '2026-10-12T09:09:34.726Z' })
  createdAt: string;
}

export class PaginationMetaDto implements PaginationMeta {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}

export class PaginatedTicketsResponseDto implements PaginatedResponse<TicketResponseDto> {
  @ApiProperty({ type: [TicketResponseDto] })
  data: TicketResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

export class TicketCountsByStatusDto implements Record<TicketStatus, number> {
  @ApiProperty({ example: 2 })
  open: number;

  @ApiProperty({ example: 1 })
  in_progress: number;

  @ApiProperty({ example: 1 })
  closed: number;
}

export class TicketStatsResponseDto implements TicketStats {
  @ApiProperty({ example: 4 })
  total: number;

  @ApiProperty({ type: TicketCountsByStatusDto })
  byStatus: TicketCountsByStatusDto;
}

export class ErrorResponseDto implements ApiErrorBody {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'Bad Request' })
  error: string;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: ['title should not be empty'],
  })
  message: string | string[];
}
