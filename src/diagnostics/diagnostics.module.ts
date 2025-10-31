import { Module } from '@nestjs/common';
import { DiagnosticsService } from './diagnostics.service';
import { DiagnosticsController } from './diagnostics.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [DiagnosticsController],
  providers: [DiagnosticsService, PrismaService],
  exports: [DiagnosticsService],
})
export class DiagnosticsModule {}





















