import {
  TICKET_DESCRIPTION_MAX_LENGTH,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TICKET_TITLE_MAX_LENGTH,
  type TicketPriority,
  type TicketStatus,
} from '@mtt/shared';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'tickets' })
@Index('idx_tickets_status_created_at', ['status', 'createdAt'])
export class Ticket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: TICKET_TITLE_MAX_LENGTH })
  title: string;

  @Column({ type: 'varchar', length: TICKET_DESCRIPTION_MAX_LENGTH, nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: TICKET_STATUSES, enumName: 'ticket_status', default: 'open' })
  status: TicketStatus;

  @Column({
    type: 'enum',
    enum: TICKET_PRIORITIES,
    enumName: 'ticket_priority',
    default: 'medium',
  })
  priority: TicketPriority;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
