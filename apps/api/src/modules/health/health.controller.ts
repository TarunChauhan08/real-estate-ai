import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { type Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('health')
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Liveness probe — the process is up' })
  liveness(): { status: 'ok'; uptimeSeconds: number } {
    return { status: 'ok', uptimeSeconds: Math.round(process.uptime()) };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe — dependencies (database) are reachable' })
  async readiness(
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ status: 'ready' | 'not_ready'; checks: { database: 'up' | 'down' } }> {
    const database = (await this.prisma.isReachable()) ? 'up' : 'down';
    if (database === 'down') res.status(HttpStatus.SERVICE_UNAVAILABLE);
    return { status: database === 'up' ? 'ready' : 'not_ready', checks: { database } };
  }
}
