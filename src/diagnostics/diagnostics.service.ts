import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DiagnosticsService {
  constructor(private prisma: PrismaService) {}

  async getUserDiagnostics(userId: string) {
    const diagnostics = await this.prisma.diagnostic.findMany({
      where: { user_id: userId },
      include: {
        questionnaire: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
      },
      orderBy: {
        generated_at: 'desc',
      },
    });

    return diagnostics;
  }

  async getDiagnosticById(id: string, userId: string) {
    const diagnostic = await this.prisma.diagnostic.findFirst({
      where: { 
        id: id,
        user_id: userId 
      },
      include: {
        questionnaire: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
      },
    });

    if (!diagnostic) {
      throw new NotFoundException('Diagnóstico não encontrado');
    }

    return diagnostic;
  }
}





















