import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { createOpenApiDocument } from '../src/swagger';

describe('OpenAPI document', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('documents every tickets endpoint with its request and response schemas', () => {
    const doc = createOpenApiDocument(app);

    expect(Object.keys(doc.paths).sort()).toEqual(['/tickets', '/tickets/stats', '/tickets/{id}']);
    expect(doc.paths['/tickets']?.post?.responses['201']).toBeDefined();
    expect(
      doc.paths['/tickets']?.get?.parameters?.map((p) => ('name' in p ? p.name : p.$ref)),
    ).toEqual(expect.arrayContaining(['status', 'page', 'limit']));
    expect(doc.paths['/tickets/{id}']?.patch?.responses['404']).toBeDefined();
    expect(doc.components?.schemas).toEqual(
      expect.objectContaining({
        CreateTicketDto: expect.any(Object),
        UpdateTicketDto: expect.any(Object),
        TicketResponseDto: expect.any(Object),
        PaginatedTicketsResponseDto: expect.any(Object),
        TicketStatsResponseDto: expect.any(Object),
        TicketStatus: expect.objectContaining({ enum: ['open', 'in_progress', 'closed'] }),
        TicketPriority: expect.objectContaining({ enum: ['low', 'medium', 'high'] }),
      }),
    );
  });
});
