import { Controller, Get, UseGuards, Request, Param, ForbiddenException } from '@nestjs/common';
import { DiagnosticsService } from './diagnostics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('diagnostics')
@UseGuards(JwtAuthGuard)
export class DiagnosticsController {
  constructor(private readonly diagnosticsService: DiagnosticsService) {}

  @Get()
  async getUserDiagnostics(@Request() req) {
    const role = req.user?.role;
    if (role === 'master' || role === 'admin') {
      return this.diagnosticsService.getAllDiagnosticsAdmin();
    }
    return this.diagnosticsService.getUserDiagnostics(req.user.id);
  }

  @Get(':id')
  async getDiagnosticById(@Request() req, @Param('id') id: string) {
    const role = req.user?.role;
    if (role === 'master' || role === 'admin') {
      return this.diagnosticsService.getDiagnosticByIdAdmin(id);
    }
    return this.diagnosticsService.getDiagnosticById(id, req.user.id);
  }

  @Get('admin/:id')
  async getDiagnosticByIdAdmin(@Request() req, @Param('id') id: string) {
    const role = req.user?.role;
    if (role !== 'master' && role !== 'admin') {
      throw new ForbiddenException('Acesso negado');
    }
    return this.diagnosticsService.getDiagnosticByIdAdmin(id);
  }

  @Get('admin')
  async getAllDiagnosticsAdmin(@Request() req) {
    const role = req.user?.role;
    if (role !== 'master' && role !== 'admin') {
      throw new ForbiddenException('Acesso negado');
    }
    return this.diagnosticsService.getAllDiagnosticsAdmin();
  }
}
