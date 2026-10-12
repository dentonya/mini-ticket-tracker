import type { PaginatedResponse, TicketStats } from '@mtt/shared';
import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListTicketsQueryDto } from './dto/list-tickets.query';
import {
  ErrorResponseDto,
  PaginatedTicketsResponseDto,
  TicketResponseDto,
  TicketStatsResponseDto,
} from './dto/ticket-responses.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { Ticket } from './ticket.entity';
import { TicketsService } from './tickets.service';

const ApiValidationErrorResponse = () =>
  ApiBadRequestResponse({ description: 'Validation failed', type: ErrorResponseDto });

@ApiTags('tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a ticket' })
  @ApiCreatedResponse({ type: TicketResponseDto })
  @ApiValidationErrorResponse()
  create(@Body() dto: CreateTicketDto): Promise<Ticket> {
    return this.ticketsService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List tickets',
    description: 'Newest first. Optionally filtered by status; paginated with page and limit.',
  })
  @ApiOkResponse({ type: PaginatedTicketsResponseDto })
  @ApiValidationErrorResponse()
  list(@Query() query: ListTicketsQueryDto): Promise<PaginatedResponse<Ticket>> {
    return this.ticketsService.list(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Count tickets grouped by status' })
  @ApiOkResponse({ type: TicketStatsResponseDto })
  stats(): Promise<TicketStats> {
    return this.ticketsService.stats();
  }

  @Patch(':id')
  @ApiOperation({
    summary: "Update a ticket's status and/or priority",
    description: 'At least one of status or priority is required; other fields are rejected.',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({ type: TicketResponseDto })
  @ApiValidationErrorResponse()
  @ApiNotFoundResponse({ description: 'Ticket not found', type: ErrorResponseDto })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTicketDto): Promise<Ticket> {
    return this.ticketsService.update(id, dto);
  }
}
