import {
  TICKET_DESCRIPTION_MAX_LENGTH,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TICKET_TITLE_MAX_LENGTH,
  type CreateTicketRequest,
  type TicketPriority,
  type TicketStatus,
} from '@mtt/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateTicketDto implements CreateTicketRequest {
  @ApiProperty({
    description: 'Short summary. Leading/trailing whitespace is trimmed.',
    maxLength: TICKET_TITLE_MAX_LENGTH,
    example: 'Login page returns 500',
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(TICKET_TITLE_MAX_LENGTH)
  title: string;

  @ApiPropertyOptional({
    maxLength: TICKET_DESCRIPTION_MAX_LENGTH,
    example: 'Started after the 14:00 deploy. Affects all browsers.',
  })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(TICKET_DESCRIPTION_MAX_LENGTH)
  description?: string;

  @ApiPropertyOptional({ enum: TICKET_STATUSES, enumName: 'TicketStatus', default: 'open' })
  @IsOptional()
  @IsIn(TICKET_STATUSES)
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TICKET_PRIORITIES, enumName: 'TicketPriority', default: 'medium' })
  @IsOptional()
  @IsIn(TICKET_PRIORITIES)
  priority?: TicketPriority;
}
