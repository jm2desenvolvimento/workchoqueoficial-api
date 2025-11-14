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

  async getAllDiagnosticsAdmin() {
    const diagnostics = await this.prisma.diagnostic.findMany({
      include: {
        questionnaire: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        generated_at: 'desc',
      },
    });
    return diagnostics;
  }

  async getDiagnosticByIdAdmin(id: string) {
    const diagnostic = await this.prisma.diagnostic.findUnique({
      where: { id },
      include: {
        questionnaire: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
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





















