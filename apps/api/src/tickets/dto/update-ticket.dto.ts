import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketPriority,
  type TicketStatus,
  type UpdateTicketRequest,
} from '@mtt/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

/**
 * Only status and priority are mutable. Any other field (e.g. title) is rejected by the
 * global ValidationPipe's `forbidNonWhitelisted` option rather than silently ignored.
 */
export class UpdateTicketDto implements UpdateTicketRequest {
  @ApiPropertyOptional({ enum: TICKET_STATUSES, enumName: 'TicketStatus', example: 'in_progress' })
  @IsOptional()
  @IsIn(TICKET_STATUSES)
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TICKET_PRIORITIES, enumName: 'TicketPriority', example: 'high' })
  @IsOptional()
  @IsIn(TICKET_PRIORITIES)
  priority?: TicketPriority;
}
