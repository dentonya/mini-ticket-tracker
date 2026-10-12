import type { ListActivityQuery } from '@mtt/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { PaginationQueryDto } from '../common/pagination.query';

export class ListActivityQueryDto extends PaginationQueryDto implements ListActivityQuery {
  @ApiPropertyOptional({
    minimum: 1,
    description: "Only return one ticket's history (works for deleted tickets too)",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  ticketId?: number;
}
