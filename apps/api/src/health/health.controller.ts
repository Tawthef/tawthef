import { Controller, Get } from '@nestjs/common';
import { DatabaseHealthService } from '../database/database-health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly databaseHealth: DatabaseHealthService) {}

  @Get()
  async check() {
    const database = await this.databaseHealth.check();
    return {
      status: 'ok',
      service: 'tawthef-api',
      database,
    };
  }
}
