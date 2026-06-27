import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly client: PrismaClient | null;

  constructor(private readonly configService: ConfigService) {
    const enabled = this.configService.get<boolean>('database.enabled');
    // Composition (not inheritance) so PrismaClient is never instantiated when disabled.
    // This prevents Prisma from reading DATABASE_URL at startup when the DB is off.
    this.client = enabled
      ? new PrismaClient({ log: ['warn', 'error'] })
      : null;
  }

  async onModuleInit() {
    if (this.client) {
      await this.client.$connect();
      this.logger.log('Database connected');
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.$disconnect();
    }
  }

  get prisma(): PrismaClient | null {
    return this.client;
  }

  get isEnabled(): boolean {
    return this.client !== null;
  }
}
