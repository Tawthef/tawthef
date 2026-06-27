import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.getOrThrow<number>('app.port');
  // Bind to 0.0.0.0 so the container is reachable from outside (required for Cloud Run)
  await app.listen(port, '0.0.0.0');
  console.log(`Tawthef API running on port ${port}`);
}

bootstrap();
