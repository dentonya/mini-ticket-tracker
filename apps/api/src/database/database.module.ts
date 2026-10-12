import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { AppConfig } from '../config/configuration';
import { TicketEvent } from '../activity/ticket-event.entity';
import { Ticket } from '../tickets/ticket.entity';
import { CreateTickets1760263200000 } from './migrations/1760263200000-CreateTickets';
import { CreateTicketEvents1760270400000 } from './migrations/1760270400000-CreateTicketEvents';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        type: 'postgres',
        url: config.get('databaseUrl', { infer: true }),
        entities: [Ticket, TicketEvent],
        // Migrations are registered explicitly (not via a glob) so they resolve the same
        // way under ts-jest, `nest start` and the compiled build.
        migrations: [CreateTickets1760263200000, CreateTicketEvents1760270400000],
        migrationsRun: true,
        synchronize: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
