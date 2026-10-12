import {
  TICKET_STATUSES,
  type PaginatedResponse,
  type TicketStats,
  type TicketStatus,
} from '@mtt/shared';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListTicketsQueryDto } from './dto/list-tickets.query';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { Ticket } from './ticket.entity';

@Injectable()
export class TicketsService {
  constructor(@InjectRepository(Ticket) private readonly tickets: Repository<Ticket>) {}

  create(dto: CreateTicketDto): Promise<Ticket> {
    const ticket = this.tickets.create({
      title: dto.title,
      description: dto.description || null,
      status: dto.status,
      priority: dto.priority,
    });
    return this.tickets.save(ticket);
  }

  async list({ status, page, limit }: ListTicketsQueryDto): Promise<PaginatedResponse<Ticket>> {
    const [data, total] = await this.tickets.findAndCount({
      where: status ? { status } : {},
      // `id` breaks ties between tickets created in the same instant so pages are stable.
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async update(id: number, dto: UpdateTicketDto): Promise<Ticket> {
    if (dto.status === undefined && dto.priority === undefined) {
      throw new BadRequestException('Provide at least one of: status, priority');
    }

    const ticket = await this.tickets.findOneBy({ id });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }

    return this.tickets.save(this.tickets.merge(ticket, dto));
  }

  async stats(): Promise<TicketStats> {
    const rows = await this.tickets
      .createQueryBuilder('ticket')
      .select('ticket.status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .groupBy('ticket.status')
      .getRawMany<{ status: TicketStatus; count: number }>();

    // Every status is always present so clients never have to handle a missing key.
    const byStatus = Object.fromEntries(TICKET_STATUSES.map((s) => [s, 0])) as Record<
      TicketStatus,
      number
    >;
    for (const { status, count } of rows) {
      byStatus[status] = count;
    }

    const total = Object.values(byStatus).reduce((sum, n) => sum + n, 0);
    return { total, byStatus };
  }
}
