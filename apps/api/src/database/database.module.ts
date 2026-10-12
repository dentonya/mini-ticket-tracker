import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { AppConfig } from '../config/configuration';
import { Ticket } from '../tickets/ticket.entity';
import { CreateTickets1760263200000 } from './migrations/1760263200000-CreateTickets';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        type: 'postgres',
        url: config.get('databaseUrl', { infer: true }),
        entities: [Ticket],
        // Migrations are registered explicitly (not via a glob) so they resolve the same
        // way under ts-jest, `nest start` and the compiled build.
        migrations: [CreateTickets1760263200000],
        migrationsRun: true,
        synchronize: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
