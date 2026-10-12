import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';

export const SWAGGER_PATH = 'docs';

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Mini Ticket Tracker API')
    .setDescription('REST API for creating, listing, updating and reporting on support tickets.')
    .setVersion('0.1.0')
    .addTag('tickets')
    .addTag('activity')
    .build();
  return SwaggerModule.createDocument(app, config);
}

/** Serves Swagger UI at /docs and the raw OpenAPI spec at /docs-json. */
export function setupSwagger(app: INestApplication): void {
  SwaggerModule.setup(SWAGGER_PATH, app, () => createOpenApiDocument(app), {
    jsonDocumentUrl: `${SWAGGER_PATH}-json`,
  });
}
