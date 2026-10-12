import type { PaginatedResponse } from '@mtt/shared';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ErrorResponseDto } from '../tickets/dto/ticket-responses.dto';
import { PaginatedActivityResponseDto } from './activity.responses';
import { ActivityService } from './activity.service';
import { ListActivityQueryDto } from './list-activity.query';
import { TicketEvent } from './ticket-event.entity';

@ApiTags('activity')
@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  @ApiOperation({
    summary: 'List activity events',
    description:
      'Audit log of ticket creations, edits and deletions, newest first. Filter by ticketId ' +
      "to get one ticket's history.",
  })
  @ApiOkResponse({ type: PaginatedActivityResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed', type: ErrorResponseDto })
  list(@Query() query: ListActivityQueryDto): Promise<PaginatedResponse<TicketEvent>> {
    return this.activityService.list(query);
  }
}
