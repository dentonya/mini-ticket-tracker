import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import type { AppConfig } from './config/configuration';
import { SWAGGER_PATH, setupSwagger } from './swagger';

async function bootstrap() {
  const app = configureApp(await NestFactory.create(AppModule));
  setupSwagger(app);
  const port = app.get(ConfigService<AppConfig, true>).get('port', { infer: true });

  await app.listen(port);
  Logger.log(`API listening on http://localhost:${port}`, 'Bootstrap');
  Logger.log(`API docs at http://localhost:${port}/${SWAGGER_PATH}`, 'Bootstrap');
}

void bootstrap();
