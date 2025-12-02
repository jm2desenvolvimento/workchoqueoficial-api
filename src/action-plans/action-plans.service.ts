import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActionPlanDto } from './dto/create-action-plan.dto';
import {
  UpdateActionPlanDto,
  UpdateActionPlanWithGoalsDto,
} from './dto/update-action-plan.dto';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { ActionPlanWithRelations } from './types/prisma.types';

export type ActionPlansGlobalStats = {
  summary: {
    total: number;
    active: number;
    completed: number;
    overdue: number;
    canceled: number;
  };
  progress: {
    avgPlanProgress: number;
    avgGoalProgress: number;
  };
  goals: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    overdue: number;
  };
  distribution: {
    byStatus: { key: string; count: number }[];
    byCategory: { key: string; count: number }[];
    byPriority: { key: string; count: number }[];
  };
};

export type ActionPlansUserStats = ActionPlansGlobalStats;

export type StatsFilters = {
  from?: Date;
  to?: Date;
  companyId?: string;
  status?: string[];
  category?: string[];
  priority?: string[];
};

@Injectable()
export class ActionPlansService {
  constructor(private prisma: PrismaService) {}

  async create(
    createActionPlanDto: CreateActionPlanDto,
    userId: string,
  ): Promise<ActionPlanWithRelations> {
    const { goals, diagnostic_id, ...actionPlanData } = createActionPlanDto;

    // Criar o plano de ação
    const createdPlan = await this.prisma.action_plan.create({
      data: {
        title: actionPlanData.title,
        description: actionPlanData.description ?? undefined,
        category: actionPlanData.category,
        status: actionPlanData.status ?? 'rascunho',
        priority: actionPlanData.priority ?? 'media',
        progress: actionPlanData.progress ?? 0,
        start_date: actionPlanData.start_date
          ? new Date(actionPlanData.start_date)
          : null,
        due_date: actionPlanData.due_date
          ? new Date(actionPlanData.due_date)
          : null,
        user_id: userId, // Alterar de user: { connect: { id: userId } }
        ...(diagnostic_id && {
          diagnostic_id: diagnostic_id, // Simplificar de diagnostic: { connect: { id: diagnostic_id } }
        }),
      },
      include: {
        goals: true,
        diagnostic: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Adicionar metas se fornecidas
    if (goals && goals.length > 0) {
      // Criar as metas em lote
      await this.prisma.goal.createMany({
        data: goals.map((goal) => ({
          title: goal.title,
          description: goal.description ?? undefined,
          status: goal.status ?? 'pendente',
          priority: goal.priority ?? 'media',
          progress: goal.progress ?? 0,
          start_date: goal.start_date ? new Date(goal.start_date) : null,
          due_date: goal.due_date ? new Date(goal.due_date) : null,
          action_plan_id: createdPlan.id,
        })),
        skipDuplicates: true,
      });

      // Buscar o plano de ação atualizado com as metas
      const updatedPlan = await this.prisma.action_plan.findUnique({
        where: { id: createdPlan.id },
        include: {
          goals: true,
          diagnostic: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return updatedPlan as unknown as ActionPlanWithRelations;
    }

    return createdPlan as unknown as ActionPlanWithRelations;
  }

  async findAllByUser(
    userId: string,
    filters?: {
      status?: string[];
      category?: string[];
      priority?: string[];
    },
  ): Promise<ActionPlanWithRelations[]> {
    const where: Prisma.action_planWhereInput = {
      user_id: userId,
      ...(filters?.status?.length && { status: { in: filters.status } }),
      ...(filters?.category?.length && { category: { in: filters.category } }),
      ...(filters?.priority?.length && { priority: { in: filters.priority } }),
    };

    return this.prisma.action_plan.findMany({
      where,
      include: {
        goals: true,
        diagnostic: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    }) as unknown as ActionPlanWithRelations[];
  }

  async findAllGlobal(filters?: {
    status?: string[];
    category?: string[];
    priority?: string[];
  }): Promise<ActionPlanWithRelations[]> {
    const where: Prisma.action_planWhereInput = {
      ...(filters?.status?.length && { status: { in: filters.status } }),
      ...(filters?.category?.length && { category: { in: filters.category } }),
      ...(filters?.priority?.length && { priority: { in: filters.priority } }),
    };

    return this.prisma.action_plan.findMany({
      where,
      include: {
        goals: true,
        diagnostic: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { created_at: 'desc' },
    }) as unknown as ActionPlanWithRelations[];
  }

  async findOne(id: string, userId: string): Promise<ActionPlanWithRelations> {
    const actionPlan = (await this.prisma.action_plan.findUnique({
      where: { id },
      include: {
        goals: true,
        diagnostic: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })) as unknown as ActionPlanWithRelations;

    if (!actionPlan) {
      throw new NotFoundException(`Action plan with ID "${id}" not found`);
    }

    if (actionPlan.user_id !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this action plan',
      );
    }

    return actionPlan;
  }

  async findOneAdmin(id: string): Promise<ActionPlanWithRelations> {
    const actionPlan = (await this.prisma.action_plan.findUnique({
      where: { id },
      include: {
        goals: true,
        diagnostic: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })) as unknown as ActionPlanWithRelations;

    if (!actionPlan) {
      throw new NotFoundException(`Action plan with ID "${id}" not found`);
    }

    return actionPlan;
  }

  async update(
    id: string,
    updateActionPlanDto: UpdateActionPlanWithGoalsDto,
    userId: string,
  ): Promise<ActionPlanWithRelations> {
    // Verificar se o usuário tem permissão para atualizar este plano
    await this.verifyOwnership(id, userId);

    const { goals, diagnostic_id, ...updateData } = updateActionPlanDto;

    // Preparar os dados para atualização
    const data: Prisma.action_planUpdateInput = {
      ...(updateData.title !== undefined && { title: updateData.title }),
      ...(updateData.description !== undefined && {
        description: updateData.description ?? null,
      }),
      ...(updateData.category !== undefined && {
        category: updateData.category,
      }),
      ...(updateData.status !== undefined && { status: updateData.status }),
      ...(updateData.priority !== undefined && {
        priority: updateData.priority,
      }),
      ...(updateData.progress !== undefined && {
        progress: updateData.progress,
      }),
      ...(updateData.start_date !== undefined && {
        start_date: updateData.start_date
          ? new Date(updateData.start_date)
          : null,
      }),
      ...(updateData.due_date !== undefined && {
        due_date: updateData.due_date ? new Date(updateData.due_date) : null,
      }),
      updated_at: new Date(),
      ...(diagnostic_id !== undefined && {
        diagnostic: diagnostic_id
          ? { connect: { id: diagnostic_id } }
          : { disconnect: true },
      }),
    };

    // Se houver metas para atualizar, processá-las primeiro
    if (goals) {
      await this.updateGoals(id, goals, userId);
    }

    // Atualizar o plano de ação
    const updatedPlan = await this.prisma.action_plan.update({
      where: { id },
      data,
      include: {
        goals: true,
        diagnostic: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return updatedPlan as unknown as ActionPlanWithRelations;
  }

  async remove(id: string, userId: string): Promise<{ id: string }> {
    await this.verifyOwnership(id, userId);
    await this.prisma.action_plan.delete({
      where: { id },
    });
    return { id };
  }

  private async verifyOwnership(planId: string, userId: string): Promise<void> {
    const actionPlan = await this.prisma.action_plan.findUnique({
      where: { id: planId },
      select: { user_id: true },
    });

    if (!actionPlan) {
      throw new NotFoundException(`Action plan with ID "${planId}" not found`);
    }

    if (actionPlan.user_id !== userId) {
      throw new ForbiddenException(
        'You do not have permission to modify this action plan',
      );
    }
  }

  /**
   * Atualiza as metas de um plano de ação
   * @param planId ID do plano de ação
   * @param goals Lista de metas para atualizar/criar
   * @param userId ID do usuário que está realizando a operação
   */
  private async updateGoals(
    planId: string,
    goals: Array<{ id?: string } & Record<string, any>>,
    userId: string,
  ): Promise<void> {
    // Verificar se o plano de ação existe e pertence ao usuário
    await this.verifyOwnership(planId, userId);

    // Obter todas as metas existentes para este plano
    const existingGoals = await this.prisma.goal.findMany({
      where: { action_plan_id: planId },
      select: { id: true }, // Remova user_id daqui
    });

    const existingGoalIds = existingGoals.map((g) => g.id);
    const newGoalIds = goals.filter((g) => g.id).map((g) => g.id) as string[];

    // Identificar metas para deletar (existem no banco mas não na nova lista)
    const goalsToDelete = existingGoalIds.filter(
      (id) => !newGoalIds.includes(id),
    );

    // Identificar metas para atualizar (existem em ambas as listas)
    const goalsToUpdate = goals.filter(
      (g): g is { id: string } & typeof g =>
        !!g.id && existingGoalIds.includes(g.id),
    );

    // Identificar metas para criar (não têm ID ou o ID não existe no banco)
    const goalsToCreate = goals.filter(
      (g) => !g.id || !existingGoalIds.includes(g.id),
    );

    // Usar transação para garantir a integridade dos dados
    const transaction: Prisma.PrismaPromise<any>[] = [];

    // 1. Deletar metas removidas
    if (goalsToDelete.length > 0) {
      transaction.push(
        this.prisma.goal.deleteMany({
          where: {
            id: { in: goalsToDelete },
            action_plan_id: planId,
          },
        }),
      );
    }

    // 2. Atualizar metas existentes
    goalsToUpdate.forEach((goal) => {
      if (!goal.id) return;

      const { id, ...goalData } = goal;

      transaction.push(
        this.prisma.goal.update({
          where: { id },
          data: {
            title: goalData.title,
            description: goalData.description ?? null,
            status: goalData.status ?? 'pendente',
            priority: goalData.priority ?? 'media',
            progress: goalData.progress ?? 0,
            start_date: goalData.start_date
              ? new Date(goalData.start_date)
              : null,
            due_date: goalData.due_date ? new Date(goalData.due_date) : null,
            updated_at: new Date(),
          },
        }),
      );
    });

    // 3. Criar novas metas
    if (goalsToCreate.length > 0) {
      transaction.push(
        this.prisma.goal.createMany({
          data: goalsToCreate.map((goal) => ({
            title: goal.title,
            description: goal.description ?? null,
            status: goal.status ?? 'pendente',
            priority: goal.priority ?? 'media',
            progress: goal.progress ?? 0,
            start_date: goal.start_date ? new Date(goal.start_date) : null,
            due_date: goal.due_date ? new Date(goal.due_date) : null,
            action_plan_id: planId,
          })),
          skipDuplicates: true,
        }),
      );
    }

    // Executar todas as operações em uma única transação
    await this.prisma.$transaction(transaction);
  }
  /**
   * Gera um plano de ação automaticamente com base em um diagnóstico
   * @param diagnosticId ID do diagnóstico
   * @param userId ID do usuário
   */
  async generateFromDiagnostic(
    diagnosticId: string,
    userId: string,
  ): Promise<ActionPlanWithRelations> {
    // Verificar se já existe um plano de ação para este diagnóstico
    const existingPlan = await this.prisma.action_plan.findFirst({
      where: {
        diagnostic_id: diagnosticId,
        user_id: userId,
      },
      include: {
        goals: true,
        diagnostic: {
          include: {
            questionnaire: true,
          },
        },
      },
    });

    // Se já existir, retornar o plano existente
    if (existingPlan) {
      return existingPlan as unknown as ActionPlanWithRelations;
    }

    // Definir tipo para o diagnóstico com as relações necessárias
    type DiagnosticWithRelations = Prisma.diagnosticGetPayload<{
      include: {
        questionnaire: true;
        user: {
          select: {
            id: true;
            name: true;
            email: true;
          };
        };
      };
    }>;

    // Buscar o diagnóstico com questionário e usuário
    const diagnostic = (await this.prisma.diagnostic.findUnique({
      where: { id: diagnosticId },
      include: {
        questionnaire: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })) as DiagnosticWithRelations;

    if (!diagnostic) {
      throw new NotFoundException('Diagnóstico não encontrado');
    }

    try {
      // Importar dinamicamente para evitar dependência circular
      const { generateActionPlan } = await import('../IAs/gemini');

      // Extrair insights e recomendações do diagnóstico
      const insights = Array.isArray(diagnostic.insights)
        ? diagnostic.insights
        : [];
      const recommendations = Array.isArray(diagnostic.recommendations)
        ? diagnostic.recommendations
        : [];
      const areasFocus = Array.isArray(diagnostic.areas_focus)
        ? diagnostic.areas_focus
        : [];

      // Criar um resumo do diagnóstico para a IA
      const diagnosticSummary = {
        insights: insights.join('\n'),
        recommendations: recommendations.join('\n'),
        areasFocus: areasFocus.join(', '),
        score:
          typeof diagnostic.score_intelligent === 'number'
            ? diagnostic.score_intelligent
            : 0,
      };

      // Gerar plano de ação com IA
      const planoIA = await generateActionPlan({
        // Usar apenas os campos que a função espera
        id: diagnostic.id,
        titulo: diagnostic.questionnaire?.title || 'Diagnóstico',
        descricao: diagnostic.questionnaire?.description || '',
        // Incluir o resumo do diagnóstico como parte do diagnóstico
        diagnostico: {
          insights: diagnosticSummary.insights,
          recomendacoes: diagnosticSummary.recommendations,
          areasFoco: diagnosticSummary.areasFocus,
          pontuacao: diagnosticSummary.score,
          dataGeracao: diagnostic.generated_at
            ? new Date(diagnostic.generated_at).toISOString()
            : new Date().toISOString(),
          dataConclusao: diagnostic.completed_at
            ? new Date(diagnostic.completed_at).toISOString()
            : null,
          status: diagnostic.status || 'concluido',
        },
        // Informações do usuário
        usuario: {
          id: diagnostic.user_id,
          nome: diagnostic.user?.name || 'Usuário',
          email: diagnostic.user?.email || '',
        },
      });

      // Mapear o plano da IA para o formato do DTO
      const actionPlanData = new CreateActionPlanDto();
      actionPlanData.title =
        planoIA.titulo ||
        `Plano de Ação - ${diagnostic.questionnaire?.title || 'Diagnóstico'}`;
      actionPlanData.description =
        planoIA.descricao ||
        `Plano gerado em ${new Date().toLocaleDateString('pt-BR')}`;

      // Garantir que a categoria seja um dos valores válidos
      const category = planoIA.tarefas?.[0]?.area || 'wellness';
      actionPlanData.category = this.mapToValidCategory(category);

      actionPlanData.status = 'rascunho';

      // Garantir que a prioridade seja um dos valores válidos
      const priority = planoIA.tarefas?.[0]?.prioridade || 'media';
      actionPlanData.priority = this.mapToValidPriority(priority);

      actionPlanData.progress =
        typeof planoIA.progresso === 'number' ? planoIA.progresso : 0;
      actionPlanData.diagnostic_id = diagnosticId;

      // Inicializar array de metas
      const goals: CreateGoalDto[] = [];

      // Mapear tarefas para metas, se existirem
      if (Array.isArray(planoIA.tarefas)) {
        planoIA.tarefas.forEach((tarefa: any, index: number) => {
          goals.push({
            title: `Meta ${index + 1}: ${tarefa.descricao?.substring(0, 60) || 'Nova meta'}${tarefa.descricao?.length > 60 ? '...' : ''}`,
            description: tarefa.descricao || 'Descrição não fornecida',
            status: 'pendente' as const,
            priority: this.mapToValidPriority(tarefa.prioridade || 'media'),
            due_date: this.calculateDueDate(
              typeof tarefa.prazoDias === 'number' ? tarefa.prazoDias : 7,
            ),
          });
        });
      }

      // Garantir pelo menos uma meta
      if (goals.length === 0) {
        goals.push({
          title: 'Revisar diagnóstico e definir metas iniciais',
          description:
            'Analisar os resultados do diagnóstico e estabelecer metas iniciais de tratamento',
          status: 'pendente' as const,
          priority: 'alta' as const,
          due_date: this.calculateDueDate(7),
        });
      }

      actionPlanData.goals = goals;

      // Criar o plano de ação usando o método existente
      return this.create(actionPlanData, userId);
    } catch (error) {
      console.error('Erro ao gerar plano de ação com IA:', error);

      // Em caso de erro, lançar exceção para ser tratada pelo controlador
      throw new Error(
        'Falha ao gerar plano de ação. Por favor, tente novamente.',
      );
    }
  }

  async getGlobalStats(
    filters: StatsFilters = {},
  ): Promise<ActionPlansGlobalStats> {
    const now = new Date();
    const wherePlan: Prisma.action_planWhereInput = {
      ...(filters.from || filters.to ? { created_at: {} as any } : {}),
      ...(filters.from ? { created_at: { gte: filters.from } } : {}),
      ...(filters.to ? { created_at: { lte: filters.to } } : {}),
      ...(filters.status?.length ? { status: { in: filters.status } } : {}),
      ...(filters.category?.length
        ? { category: { in: filters.category } }
        : {}),
      ...(filters.priority?.length
        ? { priority: { in: filters.priority } }
        : {}),
      ...(filters.companyId ? { user: { company_id: filters.companyId } } : {}),
    };

    const [
      total,
      active,
      completed,
      canceled,
      overdue,
      avgPlanProgress,
      byStatus,
      byCategory,
      byPriority,
      goalsTotal,
      goalsCompleted,
      goalsInProgress,
      goalsPending,
      goalsOverdue,
      avgGoalProgress,
    ] = await Promise.all([
      this.prisma.action_plan.count({ where: wherePlan }),
      this.prisma.action_plan
        .count({ where: { ...wherePlan, status: 'ativo' as any } })
        .catch(() => 0),
      this.prisma.action_plan
        .count({ where: { ...wherePlan, status: 'concluido' as any } })
        .catch(() => 0),
      this.prisma.action_plan
        .count({ where: { ...wherePlan, status: 'cancelado' as any } })
        .catch(() => 0),
      this.prisma.action_plan.count({
        where: {
          ...wherePlan,
          due_date: { lt: now },
          NOT: { status: 'concluido' as any },
        },
      }),
      this.prisma.action_plan
        .aggregate({ where: wherePlan, _avg: { progress: true } })
        .then((r) => r._avg.progress ?? 0),
      this.prisma.action_plan
        .groupBy({ where: wherePlan, by: ['status'], _count: { _all: true } })
        .then((rows) =>
          rows.map((r) => ({ key: String(r.status), count: r._count._all })),
        ),
      this.prisma.action_plan
        .groupBy({ where: wherePlan, by: ['category'], _count: { _all: true } })
        .then((rows) =>
          rows.map((r) => ({ key: String(r.category), count: r._count._all })),
        ),
      this.prisma.action_plan
        .groupBy({ where: wherePlan, by: ['priority'], _count: { _all: true } })
        .then((rows) =>
          rows.map((r) => ({ key: String(r.priority), count: r._count._all })),
        ),
      this.prisma.goal.count({ where: { action_plan: wherePlan } }),
      this.prisma.goal
        .count({
          where: { action_plan: wherePlan, status: 'concluida' as any },
        })
        .catch(() => 0),
      this.prisma.goal
        .count({
          where: { action_plan: wherePlan, status: 'andamento' as any },
        })
        .catch(() => 0),
      this.prisma.goal
        .count({ where: { action_plan: wherePlan, status: 'pendente' as any } })
        .catch(() => 0),
      this.prisma.goal.count({
        where: {
          action_plan: wherePlan,
          due_date: { lt: now },
          NOT: { status: 'concluida' as any },
        },
      }),
      this.prisma.goal
        .aggregate({
          where: { action_plan: wherePlan },
          _avg: { progress: true },
        })
        .then((r) => r._avg.progress ?? 0),
    ]);

    return {
      summary: { total, active, completed, overdue, canceled },
      progress: {
        avgPlanProgress: Number(avgPlanProgress) || 0,
        avgGoalProgress: Number(avgGoalProgress) || 0,
      },
      goals: {
        total: goalsTotal,
        completed: goalsCompleted,
        inProgress: goalsInProgress,
        pending: goalsPending,
        overdue: goalsOverdue,
      },
      distribution: { byStatus, byCategory, byPriority },
    };
  }

  async getUserStats(
    userId: string,
    filters: Omit<StatsFilters, 'companyId'> = {},
  ): Promise<ActionPlansUserStats> {
    return this.getGlobalStats({
      ...filters,
      companyId: undefined,
      status: filters.status,
      category: filters.category,
      priority: filters.priority,
    });
  }

  // Métodos auxiliares
  private mapToValidCategory(
    category: string,
  ): 'wellness' | 'leadership' | 'development' | 'performance' | 'career' {
    const validCategories = [
      'wellness',
      'leadership',
      'development',
      'performance',
      'career',
    ] as const;
    const normalizedCategory = category.toLowerCase();
    return validCategories.includes(normalizedCategory as any)
      ? (normalizedCategory as
          | 'wellness'
          | 'leadership'
          | 'development'
          | 'performance'
          | 'career')
      : 'wellness';
  }

  private mapToValidPriority(priority: string): 'baixa' | 'media' | 'alta' {
    const validPriorities = ['baixa', 'media', 'alta'];
    return validPriorities.includes(priority.toLowerCase())
      ? (priority.toLowerCase() as 'baixa' | 'media' | 'alta')
      : 'media';
  }

  private calculateDueDate(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  private async createBasicActionPlan(
    diagnostic: any,
    userId: string,
  ): Promise<ActionPlanWithRelations> {
    const actionPlanData = new CreateActionPlanDto();
    actionPlanData.title = `Plano de Ação - ${diagnostic.questionnaire?.title || 'Diagnóstico'}`;
    actionPlanData.description = `Plano gerado em ${new Date().toLocaleDateString('pt-BR')}`;
    actionPlanData.category = 'wellness';
    actionPlanData.status = 'rascunho';
    actionPlanData.priority = 'media';
    actionPlanData.progress = 0;
    actionPlanData.diagnostic_id = diagnostic.id;
    actionPlanData.goals = [
      {
        title: 'Revisar diagnóstico e definir metas iniciais',
        description:
          'Analisar os resultados do diagnóstico e estabelecer metas iniciais de tratamento',
        status: 'pendente',
        priority: 'alta',
      },
    ];
    return this.create(actionPlanData, userId);
  }
}
