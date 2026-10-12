import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTickets1760263200000 implements MigrationInterface {
  name = 'CreateTickets1760263200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "ticket_status" AS ENUM ('open', 'in_progress', 'closed')`,
    );
    await queryRunner.query(`CREATE TYPE "ticket_priority" AS ENUM ('low', 'medium', 'high')`);
    await queryRunner.query(`
      CREATE TABLE "tickets" (
        "id"          SERIAL PRIMARY KEY,
        "title"       VARCHAR(120)      NOT NULL,
        "description" VARCHAR(5000),
        "status"      "ticket_status"   NOT NULL DEFAULT 'open',
        "priority"    "ticket_priority" NOT NULL DEFAULT 'medium',
        "created_at"  TIMESTAMPTZ       NOT NULL DEFAULT now()
      )
    `);
    // Serves both the status filter and the newest-first ordering of GET /tickets.
    await queryRunner.query(
      `CREATE INDEX "idx_tickets_status_created_at" ON "tickets" ("status", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tickets"`);
    await queryRunner.query(`DROP TYPE "ticket_priority"`);
    await queryRunner.query(`DROP TYPE "ticket_status"`);
  }
}
