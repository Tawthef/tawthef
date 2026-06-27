import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export interface DatabaseHealthResult {
  status: 'connected' | 'disabled' | 'error';
  latencyMs?: number;
}

@Injectable()
export class DatabaseHealthService {
  constructor(private readonly prismaService: PrismaService) {}

  async check(): Promise<DatabaseHealthResult> {
    const client = this.prismaService.prisma;
    if (!client) {
      return { status: 'disabled' };
    }
    const start = Date.now();
    try {
      await client.$queryRaw`SELECT 1`;
      return { status: 'connected', latencyMs: Date.now() - start };
    } catch {
      return { status: 'error' };
    }
  }
}
