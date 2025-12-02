import { Controller, Get, Query, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Get('overview')
  async overview(@Req() req: any, @Query('from') from?: string, @Query('to') to?: string, @Query('companyId') companyId?: string) {
    const role = (req.user?.role || 'user') as 'user' | 'admin' | 'master';
    if (!(role === 'admin' || role === 'master')) throw new ForbiddenException('Permissão necessária: admin ou master');
    const range = { from, to };
    return this.reports.getOverview(range, companyId);
  }

  @Get('clients/top')
  async clientsTop(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit = '10',
    @Query('sortBy') sortBy: 'revenue' | 'engagement' = 'revenue',
  ) {
    const role = (req.user?.role || 'user') as 'user' | 'admin' | 'master';
    if (!(role === 'admin' || role === 'master')) throw new ForbiddenException('Permissão necessária: admin ou master');
    const range = { from, to };
    return this.reports.getClientsTop(range, Number(limit), sortBy);
  }

  @Get('platform/usage')
  async platformUsage(@Req() req: any, @Query('from') from?: string, @Query('to') to?: string, @Query('companyId') companyId?: string) {
    const role = (req.user?.role || 'user') as 'user' | 'admin' | 'master';
    if (!(role === 'admin' || role === 'master')) throw new ForbiddenException('Permissão necessária: admin ou master');
    const range = { from, to };
    return this.reports.getPlatformUsage(range, companyId);
  }

  @Get('financial/summary')
  async financialSummary(@Req() req: any, @Query('from') from?: string, @Query('to') to?: string, @Query('companyId') companyId?: string) {
    const role = (req.user?.role || 'user') as 'user' | 'admin' | 'master';
    if (!(role === 'admin' || role === 'master')) throw new ForbiddenException('Permissão necessária: admin ou master');
    const range = { from, to };
    return this.reports.getFinancialSummary(range, companyId);
  }

  @Get('audit/summary')
  async auditSummary(@Req() req: any, @Query('from') from?: string, @Query('to') to?: string, @Query('companyId') companyId?: string) {
    const role = (req.user?.role || 'user') as 'user' | 'admin' | 'master';
    if (!(role === 'admin' || role === 'master')) throw new ForbiddenException('Permissão necessária: admin ou master');
    const range = { from, to };
    return this.reports.getAuditSummary(range, companyId);
  }

  @Get('financial/history')
  async financialHistory(@Req() req: any, @Query('from') from?: string, @Query('to') to?: string, @Query('companyId') companyId?: string) {
    const role = (req.user?.role || 'user') as 'user' | 'admin' | 'master';
    if (!(role === 'admin' || role === 'master')) throw new ForbiddenException('Permissão necessária: admin ou master');
    const range = { from, to };
    return this.reports.getFinancialHistory(range, companyId);
  }

  @Get('clients/history')
  async clientsHistory(@Req() req: any, @Query('from') from?: string, @Query('to') to?: string) {
    const role = (req.user?.role || 'user') as 'user' | 'admin' | 'master';
    if (!(role === 'admin' || role === 'master')) throw new ForbiddenException('Permissão necessária: admin ou master');
    const range = { from, to };
    return this.reports.getClientsHistory(range);
  }

  @Get('platform/history')
  async platformHistory(@Req() req: any, @Query('from') from?: string, @Query('to') to?: string, @Query('companyId') companyId?: string) {
    const role = (req.user?.role || 'user') as 'user' | 'admin' | 'master';
    if (!(role === 'admin' || role === 'master')) throw new ForbiddenException('Permissão necessária: admin ou master');
    const range = { from, to };
    return this.reports.getPlatformHistory(range, companyId);
  }
}