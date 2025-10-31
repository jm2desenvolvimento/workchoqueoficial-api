declare module 'src/IAs/gemini' {
  export interface Task {
    descricao: string;
    prioridade: 'alta' | 'media' | 'baixa';
    area: string;
    prazoDias: number;
  }

  export interface ActionPlanResponse {
    titulo: string;
    descricao: string;
    progresso: number;
    tarefas: Task[];
  }

  export interface DiagnosticData {
    id: string;
    titulo: string;
    descricao: string;
    diagnostico: {
      insights: string;
      recomendacoes: string;
      areasFoco: string;
      pontuacao: number;
      dataGeracao: string;
      dataConclusao: string | null;
      status: string;
    };
    usuario: {
      id: string;
      nome: string;
      email: string;
    };
  }

  export function generateActionPlan(data: DiagnosticData): Promise<ActionPlanResponse>;
  export function analyzeWithGemini(input: string): Promise<string>;
  export function generateDiagnostic(questionnaire: any, userResponses: any[]): Promise<any>;
}
