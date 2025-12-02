import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AgentContext } from './types';

@Injectable()
export class ContextService {
  constructor(private prisma: PrismaService) {}

  async getUserAgentContext(
    userId: string,
    role: 'user' | 'admin' | 'master',
  ): Promise<AgentContext> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true, company_id: true },
    });

    if (!user) throw new Error('Usuário não encontrado');

    const scope: AgentContext['scope'] =
      role === 'master' ? 'global' : role === 'admin' ? 'company' : 'personal';

    const lastDiagnostic = await this.prisma.diagnostic.findFirst({
      where: { user_id: userId },
      include: { questionnaire: { select: { title: true, type: true } } },
      orderBy: { generated_at: 'desc' },
    });

    const latestPlan = await this.prisma.action_plan.findFirst({
      where: { user_id: userId },
      include: {
        goals: true,
        contents: {
          include: {
            content: { select: { id: true, title: true, type: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const engagement = (await this.prisma.user_achievement.findMany({
      where: { user_id: userId },
      include: {
        achievement: {
          select: { id: true, title: true, xp_points: true, category: true },
        },
      },
    })) as any[];

    return {
      scope,
      user: { id: user.id, name: user.name, role: user.role },
      diagnostic: lastDiagnostic
        ? {
            id: lastDiagnostic.id,
            questionnaire: {
              title: lastDiagnostic.questionnaire?.title,
              type: lastDiagnostic.questionnaire?.type,
            },
            status: lastDiagnostic.status,
            generated_at: lastDiagnostic.generated_at,
            insights: lastDiagnostic.insights,
            recommendations: lastDiagnostic.recommendations,
          }
        : undefined,
      actionPlan: latestPlan
        ? {
            id: latestPlan.id,
            title: latestPlan.title,
            status: latestPlan.status,
            progress: latestPlan.progress,
            priority: latestPlan.priority,
          }
        : undefined,
      goals: latestPlan?.goals?.map((g) => ({
        id: g.id,
        title: g.title,
        status: g.status,
        priority: g.priority,
        due_date: g.due_date ?? null,
      })),
      contents:
        latestPlan?.contents?.map((c) => ({
          id: c.content_id,
          title: c.content.title,
          type: c.content.type,
          routeOrUrl: '/conteudos/' + c.content_id,
          relevance: 1,
        })) ?? [],
      engagement: engagement.map((e) => ({
        achievementId: e.achievement_id,
        title: e.achievement.title,
        points: e.achievement.xp_points,
        unlocked: true,
      })),
    };
  }
}
