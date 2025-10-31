import { Controller, Get, UseGuards, Request, Param } from '@nestjs/common';
import { DiagnosticsService } from './diagnostics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('diagnostics')
@UseGuards(JwtAuthGuard)
export class DiagnosticsController {
  constructor(private readonly diagnosticsService: DiagnosticsService) {}

  @Get()
  async getUserDiagnostics(@Request() req) {
    return this.diagnosticsService.getUserDiagnostics(req.user.id);
  }

  @Get(':id')
  async getDiagnosticById(@Request() req, @Param('id') id: string) {
    return this.diagnosticsService.getDiagnosticById(id, req.user.id);
  }
}
