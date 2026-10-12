import {
  TICKET_DESCRIPTION_MAX_LENGTH,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TICKET_TITLE_MAX_LENGTH,
  type TicketPriority,
  type TicketStatus,
  type UpdateTicketRequest,
} from '@mtt/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Trim } from './trim';

/**
 * Partial update: every field is optional, but at least one must be sent (checked in the
 * service). Unknown fields such as `id` or `createdAt` are rejected by the global
 * ValidationPipe's `forbidNonWhitelisted` option rather than silently ignored.
 */
export class UpdateTicketDto implements UpdateTicketRequest {
  @ApiPropertyOptional({ maxLength: TICKET_TITLE_MAX_LENGTH, example: 'Login page returns 500' })
  @Trim()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(TICKET_TITLE_MAX_LENGTH)
  title?: string;

  @ApiPropertyOptional({
    maxLength: TICKET_DESCRIPTION_MAX_LENGTH,
    description: 'Send an empty string to clear the description.',
    example: 'Started after the 14:00 deploy.',
  })
  @Trim()
  @IsOptional()
  @IsString()
  @MaxLength(TICKET_DESCRIPTION_MAX_LENGTH)
  description?: string;

  @ApiPropertyOptional({ enum: TICKET_STATUSES, enumName: 'TicketStatus', example: 'in_progress' })
  @IsOptional()
  @IsIn(TICKET_STATUSES)
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TICKET_PRIORITIES, enumName: 'TicketPriority', example: 'high' })
  @IsOptional()
  @IsIn(TICKET_PRIORITIES)
  priority?: TicketPriority;
}
