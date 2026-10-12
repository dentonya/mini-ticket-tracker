import {
  TICKET_STATUSES,
  type PaginatedResponse,
  type TicketStats,
  type TicketStatus,
} from '@mtt/shared';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ActivityService } from '../activity/activity.service';
import { diffTicket, initialValues } from '../activity/ticket-changes';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListTicketsQueryDto } from './dto/list-tickets.query';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { Ticket } from './ticket.entity';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket) private readonly tickets: Repository<Ticket>,
    private readonly dataSource: DataSource,
    private readonly activity: ActivityService,
  ) {}

  create(dto: CreateTicketDto): Promise<Ticket> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Ticket);
      const ticket = await repo.save(
        repo.create({
          title: dto.title,
          description: dto.description || null,
          priority: dto.priority,
        }),
      );
      await this.activity.record(manager, {
        ticketId: ticket.id,
        ticketTitle: ticket.title,
        type: 'created',
        changes: initialValues(ticket),
      });
      return ticket;
    });
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

  async findOne(id: number): Promise<Ticket> {
    const ticket = await this.tickets.findOneBy({ id });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }
    return ticket;
  }

  async update(id: number, dto: UpdateTicketDto): Promise<Ticket> {
    const { description, ...rest } = dto;
    const changes: Partial<Ticket> = { ...rest };
    if (description !== undefined) changes.description = description || null;

    if (Object.values(changes).every((value) => value === undefined)) {
      throw new BadRequestException(
        'Provide at least one of: title, description, status, priority',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Ticket);
      const ticket = await this.findForWrite(repo, id);
      const diff = diffTicket(ticket, changes);
      // Re-sending current values is a no-op: nothing is written and nothing is logged.
      if (Object.keys(diff).length === 0) return ticket;

      const saved = await repo.save(repo.merge(ticket, changes));
      await this.activity.record(manager, {
        ticketId: id,
        ticketTitle: saved.title,
        type: 'updated',
        changes: diff,
      });
      return saved;
    });
  }

  remove(id: number): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Ticket);
      const ticket = await this.findForWrite(repo, id);
      await repo.delete({ id });
      await this.activity.record(manager, {
        ticketId: id,
        ticketTitle: ticket.title,
        type: 'deleted',
      });
    });
  }

  /**
   * Loads a ticket with a row lock, so concurrent writes are serialised and each logged diff
   * is computed against the value it actually replaced.
   */
  private async findForWrite(repo: Repository<Ticket>, id: number): Promise<Ticket> {
    const ticket = await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} not found`);
    }
    return ticket;
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
