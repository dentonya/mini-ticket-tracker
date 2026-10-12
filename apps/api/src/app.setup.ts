import { type INestApplication, ValidationPipe } from '@nestjs/common';

/**
 * Cross-cutting HTTP configuration, shared by `main.ts` and the integration tests so
 * tests exercise exactly the same validation behaviour as the running server.
 */
export function configureApp(app: INestApplication): INestApplication {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();
  return app;
}
