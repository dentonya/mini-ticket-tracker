import {
  TICKET_EVENT_TYPES,
  TICKET_TITLE_MAX_LENGTH,
  type TicketChanges,
  type TicketEventType,
} from '@mtt/shared';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'ticket_events' })
@Index('idx_ticket_events_ticket_id_created_at', ['ticketId', 'createdAt'])
@Index('idx_ticket_events_created_at', ['createdAt'])
export class TicketEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ticket_id', type: 'int' })
  ticketId: number;

  @Column({ name: 'ticket_title', type: 'varchar', length: TICKET_TITLE_MAX_LENGTH })
  ticketTitle: string;

  @Column({ type: 'enum', enum: TICKET_EVENT_TYPES, enumName: 'ticket_event_type' })
  type: TicketEventType;

  @Column({ type: 'jsonb', default: () => `'{}'` })
  changes: TicketChanges;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
