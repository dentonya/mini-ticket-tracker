import type { PaginatedResponse, Ticket, TicketStats } from '@mtt/shared';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

describe('Tickets API (integration)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await dataSource.query('TRUNCATE TABLE tickets RESTART IDENTITY');
  });

  afterAll(async () => {
    await app.close();
  });

  const createTicket = (body: object) => request(app.getHttpServer()).post('/tickets').send(body);

  /** Tickets always start open, so other statuses are reached the way clients do: via PATCH. */
  const createTicketWithStatus = async (title: string, status: string) => {
    const { body } = await createTicket({ title });
    await request(app.getHttpServer()).patch(`/tickets/${body.id}`).send({ status }).expect(200);
  };

  describe('POST /tickets', () => {
    it('creates a ticket with defaults applied', async () => {
      const res = await createTicket({ title: '  Login page 500s  ', description: 'Since deploy' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: expect.any(Number),
        title: 'Login page 500s',
        description: 'Since deploy',
        status: 'open',
        priority: 'medium',
        createdAt: expect.any(String),
      });
      expect(Number.isNaN(Date.parse(res.body.createdAt))).toBe(false);
    });

    it('accepts an explicit priority and always starts the ticket as open', async () => {
      const res = await createTicket({ title: 'Hotfix', priority: 'high' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        status: 'open',
        priority: 'high',
        description: null,
      });
    });

    it.each([
      ['missing title', {}],
      ['blank title', { title: '   ' }],
      ['title over 120 chars', { title: 'x'.repeat(121) }],
      ['a status (tickets always start open)', { title: 'Bug', status: 'in_progress' }],
      ['unknown priority', { title: 'Bug', priority: 'urgent' }],
      ['unexpected field', { title: 'Bug', assignee: 'alex' }],
    ])('rejects %s with 400', async (_case, body) => {
      const res = await createTicket(body);

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ statusCode: 400, error: 'Bad Request' });
    });
  });

  describe('GET /tickets', () => {
    it('filters by status and paginates newest first', async () => {
      for (const title of ['A', 'B', 'C']) await createTicket({ title });
      await createTicketWithStatus('Done one', 'closed');

      const page1 = await request(app.getHttpServer()).get('/tickets?status=open&page=1&limit=2');
      const page2 = await request(app.getHttpServer()).get('/tickets?status=open&page=2&limit=2');

      const body1 = page1.body as PaginatedResponse<Ticket>;
      const body2 = page2.body as PaginatedResponse<Ticket>;
      expect(page1.status).toBe(200);
      expect(body1.data.map((t) => t.title)).toEqual(['C', 'B']);
      expect(body1.meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });
      expect(body2.data.map((t) => t.title)).toEqual(['A']);
    });

    it('returns every ticket when no status filter is given', async () => {
      await createTicket({ title: 'Open' });
      await createTicketWithStatus('Closed', 'closed');

      const res = await request(app.getHttpServer()).get('/tickets');

      expect(res.status).toBe(200);
      expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1 });
    });

    it.each(['status=bogus', 'page=0', 'limit=101', 'limit=abc'])(
      'rejects invalid query %s with 400',
      async (qs) => {
        const res = await request(app.getHttpServer()).get(`/tickets?${qs}`);
        expect(res.status).toBe(400);
      },
    );
  });

  describe('PATCH /tickets/:id', () => {
    it('updates status and priority', async () => {
      const { body: created } = await createTicket({ title: 'Flaky test' });

      const res = await request(app.getHttpServer())
        .patch(`/tickets/${created.id}`)
        .send({ status: 'closed', priority: 'low' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: created.id, status: 'closed', priority: 'low' });
      expect(res.body.title).toBe('Flaky test');
    });

    it('edits title and description, trimming input', async () => {
      const { body: created } = await createTicket({ title: 'Flaky test' });

      const res = await request(app.getHttpServer())
        .patch(`/tickets/${created.id}`)
        .send({ title: '  Flaky login test  ', description: 'Fails 1 in 10 runs' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        title: 'Flaky login test',
        description: 'Fails 1 in 10 runs',
        status: 'open',
      });
    });

    it('clears the description when an empty string is sent', async () => {
      const { body: created } = await createTicket({ title: 'Bug', description: 'Old notes' });

      const res = await request(app.getHttpServer())
        .patch(`/tickets/${created.id}`)
        .send({ description: '' });

      expect(res.status).toBe(200);
      expect(res.body.description).toBeNull();
    });

    it('returns 404 for a ticket that does not exist', async () => {
      const res = await request(app.getHttpServer())
        .patch('/tickets/9999')
        .send({ status: 'closed' });

      expect(res.status).toBe(404);
    });

    it.each([
      ['empty body', {}],
      ['blank title', { title: '   ' }],
      ['immutable field', { createdAt: '2020-01-01T00:00:00.000Z' }],
      ['invalid status', { status: 'resolved' }],
    ])('rejects %s with 400', async (_case, body) => {
      const { body: created } = await createTicket({ title: 'Flaky test' });

      const res = await request(app.getHttpServer()).patch(`/tickets/${created.id}`).send(body);

      expect(res.status).toBe(400);
    });

    it('rejects a non-numeric id with 400', async () => {
      const res = await request(app.getHttpServer()).patch('/tickets/abc').send({ status: 'open' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /tickets/:id', () => {
    it('returns a single ticket', async () => {
      const { body: created } = await createTicket({ title: 'Single' });

      const res = await request(app.getHttpServer()).get(`/tickets/${created.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(created);
    });

    it('returns 404 for a ticket that does not exist', async () => {
      const res = await request(app.getHttpServer()).get('/tickets/9999');
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /tickets/:id', () => {
    it('deletes the ticket and removes it from listings and stats', async () => {
      const { body: keep } = await createTicket({ title: 'Keep' });
      const { body: drop } = await createTicket({ title: 'Drop' });

      const res = await request(app.getHttpServer()).delete(`/tickets/${drop.id}`);

      expect(res.status).toBe(204);
      expect(res.body).toEqual({});
      await request(app.getHttpServer()).get(`/tickets/${drop.id}`).expect(404);
      const list = await request(app.getHttpServer()).get('/tickets');
      expect(list.body.data.map((t: Ticket) => t.id)).toEqual([keep.id]);
      const stats = await request(app.getHttpServer()).get('/tickets/stats');
      expect(stats.body.total).toBe(1);
    });

    it('returns 404 when the ticket does not exist', async () => {
      const res = await request(app.getHttpServer()).delete('/tickets/9999');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /tickets/stats', () => {
    it('returns zero for every status when there are no tickets', async () => {
      const res = await request(app.getHttpServer()).get('/tickets/stats');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ total: 0, byStatus: { open: 0, in_progress: 0, closed: 0 } });
    });

    it('counts tickets grouped by status and reflects updates', async () => {
      await createTicket({ title: 'A' });
      await createTicket({ title: 'B' });
      await createTicketWithStatus('C', 'in_progress');
      const { body: toClose } = await createTicket({ title: 'D' });
      await request(app.getHttpServer()).patch(`/tickets/${toClose.id}`).send({ status: 'closed' });

      const res = await request(app.getHttpServer()).get('/tickets/stats');

      expect(res.status).toBe(200);
      expect(res.body as TicketStats).toEqual({
        total: 4,
        byStatus: { open: 2, in_progress: 1, closed: 1 },
      });
    });
  });
});
