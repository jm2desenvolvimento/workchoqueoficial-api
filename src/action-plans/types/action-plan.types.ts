import { action_plan, goal } from '@prisma/client';

// Tipos para os enums
export type GoalStatus = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
export type GoalPriority = 'baixa' | 'media' | 'alta';
export type PlanStatus = 'rascunho' | 'em_andamento' | 'pausado' | 'concluido' | 'cancelado';
export type PlanPriority = 'baixa' | 'media' | 'alta';
export type PlanCategory = 'leadership' | 'wellness' | 'development' | 'performance' | 'career';

// Tipos de retorno
export type ActionPlanWithRelations = action_plan & {
  goals?: goal[];
  diagnostic?: any; // Substitua 'any' pelo tipo correto quando disponível
};

export type GoalWithTasks = goal & {
  tasks?: any[]; // Substitua 'any[]' pelo tipo correto quando disponível
};

// Tipos para criação/atualização
export interface GoalCreateInput {
  title: string;
  description?: string | null;
  status?: GoalStatus;
  priority?: GoalPriority;
  progress?: number;
  start_date?: Date | string | null;
  due_date?: Date | string | null;
}

export interface GoalUpdateInput extends Partial<GoalCreateInput> {
  id?: string;
  updated_at?: Date;
}

export interface GoalUpsertInput {
  where: { id: string };
  update: GoalUpdateInput;
  create: GoalCreateInput;
}

export interface ActionPlanCreateInput {
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
  goals?: GoalCreateInput[];
}

export interface ActionPlanUpdateInput extends Partial<Omit<ActionPlanCreateInput, 'user_id' | 'goals'>> {
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
  diagnostic_id?: string | null;
}
