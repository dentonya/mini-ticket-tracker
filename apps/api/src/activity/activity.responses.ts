import {
  TICKET_EVENT_TYPES,
  type PaginatedResponse,
  type TicketChanges,
  type TicketEvent,
  type TicketEventType,
} from '@mtt/shared';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../tickets/dto/ticket-responses.dto';

export class TicketEventResponseDto implements TicketEvent {
  @ApiProperty({ example: 7 })
  id: number;

  @ApiProperty({ example: 1 })
  ticketId: number;

  @ApiProperty({ description: 'Title at the time of the event', example: 'Login page returns 500' })
  ticketTitle: string;

  @ApiProperty({ enum: TICKET_EVENT_TYPES, enumName: 'TicketEventType', example: 'updated' })
  type: TicketEventType;

  @ApiProperty({
    description: 'Changed fields with their previous and new values (from is null on creation)',
    type: 'object',
    additionalProperties: {
      type: 'object',
      properties: { from: { nullable: true }, to: { nullable: true } },
    },
    example: { status: { from: 'open', to: 'in_progress' } },
  })
  changes: TicketChanges;

  @ApiProperty({ format: 'date-time', example: '2026-10-12T10:15:00.000Z' })
  createdAt: string;
}

export class PaginatedActivityResponseDto implements PaginatedResponse<TicketEventResponseDto> {
  @ApiProperty({ type: [TicketEventResponseDto] })
  data: TicketEventResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
