import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTicketEvents1760270400000 implements MigrationInterface {
  name = 'CreateTicketEvents1760270400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "ticket_event_type" AS ENUM ('created', 'updated', 'deleted')`,
    );
    // No foreign key to tickets: events must outlive the ticket so deletions stay auditable.
    await queryRunner.query(`
      CREATE TABLE "ticket_events" (
        "id"           SERIAL PRIMARY KEY,
        "ticket_id"    INTEGER             NOT NULL,
        "ticket_title" VARCHAR(120)        NOT NULL,
        "type"         "ticket_event_type" NOT NULL,
        "changes"      JSONB               NOT NULL DEFAULT '{}',
        "created_at"   TIMESTAMPTZ         NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_ticket_events_ticket_id_created_at" ON "ticket_events" ("ticket_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_ticket_events_created_at" ON "ticket_events" ("created_at")`,
    );
    // Give tickets that existed before the log a starting "created" entry. Tickets always
    // start as open; the current priority is the best available guess for the initial one.
    await queryRunner.query(`
      INSERT INTO "ticket_events" ("ticket_id", "ticket_title", "type", "changes", "created_at")
      SELECT "id", "title", 'created',
             jsonb_build_object(
               'title',    jsonb_build_object('from', NULL, 'to', "title"),
               'status',   jsonb_build_object('from', NULL, 'to', 'open'),
               'priority', jsonb_build_object('from', NULL, 'to', "priority")
             )
             || CASE WHEN "description" IS NULL THEN '{}'::jsonb
                     ELSE jsonb_build_object(
                       'description', jsonb_build_object('from', NULL, 'to', "description"))
                END,
             "created_at"
      FROM "tickets"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "ticket_events"`);
    await queryRunner.query(`DROP TYPE "ticket_event_type"`);
  }
}
