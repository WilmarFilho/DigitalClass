import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';

@Controller('dashboard')
@UseGuards(SupabaseJwtGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(@Req() req: any) {
    return this.dashboardService.getStats(req.user.id);
  }

  @Get('consistency')
  async getConsistency(@Req() req: any) {
    return this.dashboardService.getConsistency(req.user.id);
  }

  @Get('last-assets')
  async getLastAssets(
    @Req() req: any,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? Math.min(parseInt(limit, 10) || 5, 20) : 5;
    return this.dashboardService.getLastAssets(req.user.id, limitNum);
  }
}
