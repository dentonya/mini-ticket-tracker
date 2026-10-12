import { TICKET_STATUSES, type ListTicketsQuery, type TicketStatus } from '@mtt/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination.query';

export class ListTicketsQueryDto extends PaginationQueryDto implements ListTicketsQuery {
  @ApiPropertyOptional({
    enum: TICKET_STATUSES,
    enumName: 'TicketStatus',
    description: 'Only return tickets with this status',
  })
  @IsOptional()
  @IsIn(TICKET_STATUSES)
  status?: TicketStatus;
}
