import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DatabaseLoggerService } from './supabase/database-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  const logger = app.get(DatabaseLoggerService);
  app.useLogger(logger);

  app.enableCors({
    origin: ['https://class.nkwflow.com', 'http://localhost:3000'],
    credentials: true,
  });

  await app.listen(process.env.PORT || 3003, '0.0.0.0');
}

bootstrap();
