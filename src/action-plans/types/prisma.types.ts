import { Prisma } from '@prisma/client';

// Tipos para os enums
export type GoalStatus = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
export type GoalPriority = 'baixa' | 'media' | 'alta';
export type PlanStatus = 'rascunho' | 'em_andamento' | 'pausado' | 'concluido' | 'cancelado';
export type PlanPriority = 'baixa' | 'media' | 'alta';
export type PlanCategory = 'leadership' | 'wellness' | 'development' | 'performance' | 'career';

// Tipos de retorno
export type ActionPlanWithRelations = Prisma.action_planGetPayload<{
  include: {
    goals: true;
    diagnostic: true;
    user: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
  };
}>;

export type GoalWithTasks = Prisma.goalGetPayload<{
  include: {
    tasks: true;
  };
}>;

// Tipos para criação/atualização
export type GoalCreateData = {
  title: string;
  description?: string | null;
  status?: GoalStatus;
  priority?: GoalPriority;
  progress?: number;
  start_date?: Date | string | null;
  due_date?: Date | string | null;
};

export type GoalUpdateData = Partial<GoalCreateData> & {
  id?: string;
  updated_at?: Date;
};

export type GoalUpsertData = {
  where: { id: string };
  update: GoalUpdateData;
  create: GoalCreateData;
};

export type ActionPlanCreateData = {
  title: string;
  description?: string | null;
  category: PlanCategory;
  status?: PlanStatus;
  priority?: PlanPriority;
  progress?: number;
  start_date?: Date | string | null;
  due_date?: Date | string | null;
  user_id: string;
  diagnostic_id?: string | null;
  goals?: GoalCreateData[];
};

export type ActionPlanUpdateData = {
  title?: string;
  description?: string | null;
  category?: PlanCategory;
  status?: PlanStatus;
  priority?: PlanPriority;
  progress?: number;
  start_date?: Date | string | null;
  due_date?: Date | string | null;
  updated_at?: Date;
  diagnostic_id?: string | null;
  goals?: Array<{
    id?: string;
    title: string;
    description?: string | null;
    status: GoalStatus;
    priority: GoalPriority;
    progress: number;
    start_date?: Date | string | null;
    due_date?: Date | string | null;
    updated_at?: Date;
  }>;
};