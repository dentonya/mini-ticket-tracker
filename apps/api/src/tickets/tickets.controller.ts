import type { PaginatedResponse, TicketStats } from '@mtt/shared';
import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListTicketsQueryDto } from './dto/list-tickets.query';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { Ticket } from './ticket.entity';
import { TicketsService } from './tickets.service';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  create(@Body() dto: CreateTicketDto): Promise<Ticket> {
    return this.ticketsService.create(dto);
  }

  @Get()
  list(@Query() query: ListTicketsQueryDto): Promise<PaginatedResponse<Ticket>> {
    return this.ticketsService.list(query);
  }

  @Get('stats')
  stats(): Promise<TicketStats> {
    return this.ticketsService.stats();
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTicketDto): Promise<Ticket> {
    return this.ticketsService.update(id, dto);
  }
}
