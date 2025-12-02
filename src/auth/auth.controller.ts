import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
  Req,
  UnauthorizedException,
  Query,
  Param,
  Put,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuditService } from './audit.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private auditService: AuditService,
  ) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: any) {
    const requestInfo = {
      ip:
        req.ip ||
        req.connection.remoteAddress ||
        req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent'],
    };

    return this.authService.login(loginDto, requestInfo);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout() {
    // Em uma implementação mais robusta, você poderia adicionar o token a uma blacklist
    return { message: 'Logout realizado com sucesso' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('users')
  async getUsers(@Request() req) {
    return this.authService.getUsers();
  }

  @UseGuards(JwtAuthGuard)
  @Put('users/:id/permissions')
  async updateUserPermissions(
    @Param('id') userId: string,
    @Body() body: { permissions: string[] },
    @Request() req,
  ) {
    // Only allow masters to update user permissions
    if (req.user.role !== 'master') {
      throw new UnauthorizedException(
        'Apenas usuários Master podem editar permissões',
      );
    }

    return this.authService.updateUserPermissions(userId, body.permissions);
  }

  @UseGuards(JwtAuthGuard)
  @Get('activity-stats')
  async getActivityStats(@Request() req) {
    return this.authService.getUserActivityStats(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('users/:id/activity-stats')
  async getUserActivityStats(@Request() req) {
    // Only allow admins and masters to view other users' stats
    if (req.user.role !== 'admin' && req.user.role !== 'master') {
      throw new UnauthorizedException('Acesso negado');
    }

    const userId = req.params.id;
    return this.authService.getUserActivityStats(userId);
  }

  // ==================== AUDIT ENDPOINTS ====================

  @UseGuards(JwtAuthGuard)
  @Get('audit/stats')
  async getAuditStats(
    @Request() req,
    @Query('period') period?: '24h' | '7d' | '30d',
  ) {
    // Only allow users with audit view permission
    if (req.user.role !== 'admin' && req.user.role !== 'master') {
      throw new UnauthorizedException(
        'Acesso negado - Permissão auditoria.view necessária',
      );
    }

    return this.auditService.getAuditStats(period);
  }

  @UseGuards(JwtAuthGuard)
  @Get('audit/activity-logs')
  async getAuditLogs(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('ipAddress') ipAddress?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Only allow users with audit view permission
    if (req.user.role !== 'admin' && req.user.role !== 'master') {
      throw new UnauthorizedException(
        'Acesso negado - Permissão auditoria.view necessária',
      );
    }

    return this.auditService.getAuditLogs({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      userId,
      action,
      ipAddress,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('audit/login-history')
  async getLoginHistory(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Only allow users with audit view permission
    if (req.user.role !== 'admin' && req.user.role !== 'master') {
      throw new UnauthorizedException(
        'Acesso negado - Permissão auditoria.view necessária',
      );
    }

    return this.auditService.getLoginHistory({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      userId,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('audit/security-alerts')
  async getSecurityAlerts(
    @Request() req,
    @Query('status') status?: 'new' | 'investigating' | 'resolved',
  ) {
    // Only allow users with audit view permission
    if (req.user.role !== 'admin' && req.user.role !== 'master') {
      throw new UnauthorizedException(
        'Acesso negado - Permissão auditoria.view necessária',
      );
    }

    return this.auditService.getSecurityAlerts(status);
  }

  @UseGuards(JwtAuthGuard)
  @Put('audit/security-alerts/:id/status')
  async updateSecurityAlertStatus(
    @Request() req,
    @Param('id') alertId: string,
    @Body() body: { status: 'new' | 'investigating' | 'resolved' },
  ) {
    // Only allow users with audit view permission
    if (req.user.role !== 'admin' && req.user.role !== 'master') {
      throw new UnauthorizedException(
        'Acesso negado - Permissão auditoria.view necessária',
      );
    }

    return this.auditService.updateSecurityAlertStatus(alertId, body.status);
  }
}
