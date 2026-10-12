import type { PaginatedResponse, TicketEvent } from '@mtt/shared';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

describe('Activity log (integration)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await dataSource.query('TRUNCATE TABLE tickets, ticket_events RESTART IDENTITY');
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const create = async (body: object) =>
    (await http().post('/tickets').send(body).expect(201)).body;
  const history = async (ticketId: number) =>
    (
      (await http().get(`/activity?ticketId=${ticketId}`).expect(200))
        .body as PaginatedResponse<TicketEvent>
    ).data;

  it('records creation with the initial values', async () => {
    const ticket = await create({ title: 'Login 500', priority: 'high' });

    expect(await history(ticket.id)).toEqual([
      {
        id: expect.any(Number),
        ticketId: ticket.id,
        ticketTitle: 'Login 500',
        type: 'created',
        changes: {
          title: { from: null, to: 'Login 500' },
          status: { from: null, to: 'open' },
          priority: { from: null, to: 'high' },
        },
        createdAt: expect.any(String),
      },
    ]);
  });

  it('records only the fields that changed, newest first', async () => {
    const ticket = await create({ title: 'Login 500', description: 'Old' });
    await http().patch(`/tickets/${ticket.id}`).send({ status: 'in_progress' }).expect(200);
    await http()
      .patch(`/tickets/${ticket.id}`)
      .send({ title: 'Login returns 500', description: '', priority: 'medium' })
      .expect(200);

    const [latest, statusChange, created] = await history(ticket.id);

    expect(created?.type).toBe('created');
    expect(statusChange).toMatchObject({
      type: 'updated',
      changes: { status: { from: 'open', to: 'in_progress' } },
    });
    // priority was already "medium", so it is not part of the diff.
    expect(latest).toMatchObject({
      type: 'updated',
      ticketTitle: 'Login returns 500',
      changes: {
        title: { from: 'Login 500', to: 'Login returns 500' },
        description: { from: 'Old', to: null },
      },
    });
    expect(latest?.changes).not.toHaveProperty('priority');
  });

  it('does not log an update that changes nothing', async () => {
    const ticket = await create({ title: 'Same' });
    await http().patch(`/tickets/${ticket.id}`).send({ status: 'open' }).expect(200);

    expect(await history(ticket.id)).toHaveLength(1);
  });

  it('keeps the history of a deleted ticket and logs the deletion', async () => {
    const ticket = await create({ title: 'Short-lived' });
    await http().delete(`/tickets/${ticket.id}`).expect(204);

    const events = await history(ticket.id);
    expect(events.map((e) => e.type)).toEqual(['deleted', 'created']);
    expect(events[0]).toMatchObject({ ticketTitle: 'Short-lived', changes: {} });
  });

  it('does not log failed writes', async () => {
    await http().patch('/tickets/9999').send({ status: 'closed' }).expect(404);
    await http().delete('/tickets/9999').expect(404);

    const res = await http().get('/activity').expect(200);
    expect(res.body.meta.total).toBe(0);
  });

  it('lists events across all tickets with pagination', async () => {
    const a = await create({ title: 'A' });
    const b = await create({ title: 'B' });
    await http().patch(`/tickets/${a.id}`).send({ status: 'closed' }).expect(200);

    const page1 = await http().get('/activity?page=1&limit=2').expect(200);
    const page2 = await http().get('/activity?page=2&limit=2').expect(200);

    expect(page1.body.meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });
    expect(page1.body.data.map((e: TicketEvent) => [e.ticketId, e.type])).toEqual([
      [a.id, 'updated'],
      [b.id, 'created'],
    ]);
    expect(page2.body.data.map((e: TicketEvent) => [e.ticketId, e.type])).toEqual([
      [a.id, 'created'],
    ]);
  });

  it.each(['ticketId=abc', 'ticketId=0', 'limit=101'])('rejects %s with 400', async (qs) => {
    await http().get(`/activity?${qs}`).expect(400);
  });
});
