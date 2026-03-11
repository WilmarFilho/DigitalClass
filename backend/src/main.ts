import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true }); // Allow frontend (localhost:3000) and any origin in dev
  await app.listen(3001);
}
bootstrap();
