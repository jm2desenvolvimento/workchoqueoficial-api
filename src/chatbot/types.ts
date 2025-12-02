export interface AgentContext {
  scope: 'personal' | 'company' | 'global';
  user: { id: string; name: string; role: 'user' | 'admin' | 'master' };
  diagnostic?: {
    id: string;
    questionnaire?: { title?: string; type?: string };
    status?: string;
    generated_at?: string | Date | null;
    insights?: string[];
    recommendations?: string[];
  };
  actionPlan?: {
    id: string;
    title: string;
    status: string;
    progress: number;
    priority: string;
  };
  goals?: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    progress?: number;
    due_date?: Date | string | null;
  }>;
  contents?: Array<{
    id: string;
    title: string;
    type: string;
    routeOrUrl?: string;
    relevance?: number;
  }>;
  engagement?: Array<{
    achievementId: string;
    title: string;
    points?: number;
    unlocked?: boolean;
  }>;
}

export interface AgentAction {
  label: string;
  route: string;
  intent: string;
  payload?: Record<string, unknown>;
}

export interface AgentResponse {
  direct_answer: string;
  simple_explanation: string;
  plan_connection?: string;
  recommended_actions: AgentAction[];
  motivation: string;
  follow_up_question: string;
  context_used: string[];
}
