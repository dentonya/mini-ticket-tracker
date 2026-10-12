import type { PaginatedResponse, TicketChanges, TicketEventType } from '@mtt/shared';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { ListActivityQueryDto } from './list-activity.query';
import { TicketEvent } from './ticket-event.entity';

export interface RecordEventInput {
  ticketId: number;
  ticketTitle: string;
  type: TicketEventType;
  changes?: TicketChanges;
}

@Injectable()
export class ActivityService {
  constructor(@InjectRepository(TicketEvent) private readonly events: Repository<TicketEvent>) {}

  /**
   * Writes an event using the caller's transaction manager, so the event is committed or
   * rolled back together with the ticket change it describes.
   */
  async record(manager: EntityManager, input: RecordEventInput): Promise<void> {
    await manager.insert(TicketEvent, { changes: {}, ...input });
  }

  async list({
    ticketId,
    page,
    limit,
  }: ListActivityQueryDto): Promise<PaginatedResponse<TicketEvent>> {
    const [data, total] = await this.events.findAndCount({
      where: ticketId ? { ticketId } : {},
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
}
