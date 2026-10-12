import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketPriority,
  type TicketStatus,
  type UpdateTicketRequest,
} from '@mtt/shared';
import { IsIn, IsOptional } from 'class-validator';

/**
 * Only status and priority are mutable. Any other field (e.g. title) is rejected by the
 * global ValidationPipe's `forbidNonWhitelisted` option rather than silently ignored.
 */
export class UpdateTicketDto implements UpdateTicketRequest {
  @IsOptional()
  @IsIn(TICKET_STATUSES)
  status?: TicketStatus;

  @IsOptional()
  @IsIn(TICKET_PRIORITIES)
  priority?: TicketPriority;
}
