import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { API_PREFIX, configureApp } from './app.setup';
import { AppConfigService } from './config/app-config.service';
import { initErrorReporting } from './observability/error-reporting';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: false,
    // Keep the exact request bytes: WhatsApp webhooks are verified by an HMAC over them.
    rawBody: true,
  });
  configureApp(app);

  const config = app.get(AppConfigService);
  const reporting = initErrorReporting({
    dsn: config.get('SENTRY_DSN'),
    environment: config.get('SENTRY_ENVIRONMENT') ?? config.get('NODE_ENV'),
    release: process.env.APP_VERSION,
    tracesSampleRate: config.get('SENTRY_TRACES_SAMPLE_RATE'),
  });
  const port = config.get('API_PORT');
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`API listening on http://localhost:${port}/${API_PREFIX}`);
  logger.log(reporting ? 'Error reporting: Sentry' : 'Error reporting: off (set SENTRY_DSN)');
  if (!config.isProduction)
    logger.log(`Swagger docs at http://localhost:${port}/${API_PREFIX}/docs`);
}

void bootstrap();
