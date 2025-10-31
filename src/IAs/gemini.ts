import axios from 'axios';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY não definida nas variáveis de ambiente.');
}

/**
 * Faz uma requisição à API Gemini para análise de texto.
 * @param input Texto a ser analisado
 * @returns Texto da análise gerada pela IA
 */
export async function analyzeWithGemini(input: string): Promise<string> {
  const payload = {
    contents: [
      {
        parts: [
          { text: input }
        ]
      }
    ]
  };

  const url = `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = response.data;
    // O texto gerado geralmente vem em data.candidates[0].content.parts[0].text
    const analysis = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta da IA.';
    return analysis;
  } catch (err: any) {
    const msg = err?.response?.data?.error?.message || err.message;
    throw new Error('Erro ao consultar Gemini: ' + msg);
  }
}

/**
 * Gera diagnóstico inteligente baseado nas respostas do questionário
 * @param questionnaire Dados do questionário
 * @param userResponses Respostas do usuário
 * @returns Análise estruturada da IA
 */
export async function generateDiagnostic(
  questionnaire: any,
  userResponses: any[]
): Promise<{
  insights: string[];
  recommendations: string[];
  areas_focus: string[];
  score_intelligent: number;
  analysis_summary: string;
}> {
  const prompt = buildDiagnosticPrompt(questionnaire, userResponses);
  const response = await analyzeWithGemini(prompt);
  return parseDiagnosticResponse(response);
}

/**
 * Gera um Plano de Ação baseado no diagnóstico
 * @param diagnostico Dados do diagnóstico
 * @returns Plano de Ação estruturado
 */
export async function generateActionPlan(diagnostico: any): Promise<{
  titulo: string;
  descricao: string;
  dataInicio: string;
  dataFim: string;
  status: 'pendente' | 'em_andamento' | 'concluido' | 'atrasado';
  progresso: number;
  tarefas: Array<{
    descricao: string;
    prioridade: 'alta' | 'media' | 'baixa';
    area: string;
    prazoDias: number;
  }>;
}> {
  const prompt = buildActionPlanPrompt(diagnostico);
  const response = await analyzeWithGemini(prompt);
  return parseActionPlanResponse(response, diagnostico.id);
}

/**
 * Constrói o prompt para geração do Plano de Ação
 */
function buildActionPlanPrompt(diagnostico: any): string {
  return `Você é um consultor empresarial especializado em desenvolvimento organizacional. 
Com base no diagnóstico abaixo, crie um Plano de Ação detalhado com tarefas específicas, prazos e prioridades.

DIAGNÓSTICO:
${JSON.stringify(diagnostico, null, 2)}

INSTRUÇÕES:
1. Analise as áreas de melhoria identificadas no diagnóstico
2. Crie um plano de ação prático e realista
3. Inclua prazos realistas (em dias a partir de hoje)
4. Defina prioridades claras (alta, média, baixa)
5. Agrupe as tarefas por área de negócio
6. Inclua métricas de sucesso para cada tarefa

FORMATO DA RESPOSTA (em JSON):
{
  "titulo": "Título do Plano de Ação",
  "descricao": "Descrição geral do plano com objetivos claros",
  "dataInicio": "2024-01-01", // Data de início (hoje)
  "dataFim": "2024-12-31",   // Data de término (até 1 ano)
  "status": "pendente",
  "progresso": 0,
  "tarefas": [
    {
      "descricao": "Descrição detalhada da tarefa",
      "prioridade": "alta|media|baixa",
      "area": "Comunicação|Liderança|Recursos Humanos|etc",
      "prazoDias": 30 // Dias até o vencimento a partir de hoje
    }
  ]
}`;
}

/**
 * Processa a resposta da IA e converte para formato estruturado
 */
function parseActionPlanResponse(response: string, diagnosticoId: string): any {
  try {
    // Tenta extrair o JSON da resposta
    const jsonStart = response.indexOf('{');
    const jsonEnd = response.lastIndexOf('}') + 1;
    const jsonString = response.substring(jsonStart, jsonEnd);
    
    const plano = JSON.parse(jsonString);
    
    // Validação básica da estrutura
    if (!plano.titulo || !plano.descricao || !Array.isArray(plano.tarefas)) {
      throw new Error('Resposta da IA não está no formato esperado');
    }
    
    // Adiciona IDs e padroniza as tarefas
    const tarefas = plano.tarefas.map((tarefa: any, index: number) => ({
      id: `tarefa-${Date.now()}-${index}`,
      descricao: tarefa.descricao,
      concluida: false,
      prioridade: tarefa.prioridade || 'media',
      area: tarefa.area || 'Geral',
      prazoDias: tarefa.prazoDias || 30
    }));
    
    // Calcula a data de término baseada no maior prazo das tarefas
    const hoje = new Date();
    const maiorPrazoDias = Math.max(...tarefas.map((t: any) => t.prazoDias), 30);
    const dataFim = new Date();
    dataFim.setDate(hoje.getDate() + maiorPrazoDias);
    
    return {
      ...plano,
      id: `plano-${Date.now()}`,
      diagnosticoId,
      dataInicio: hoje.toISOString().split('T')[0],
      dataFim: dataFim.toISOString().split('T')[0],
      status: 'pendente',
      progresso: 0,
      responsaveis: [],
      anexos: [],
      historico: [{
        id: `hist-${Date.now()}`,
        acao: 'Plano de Ação criado automaticamente a partir do diagnóstico',
        data: new Date().toISOString(),
        usuario: 'Sistema'
      }],
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      criadoPor: 'Sistema',
      tarefas
    };
  } catch (error) {
    console.error('Erro ao processar resposta do Gemini:', error);
    throw new Error('Falha ao processar o plano de ação gerado pela IA');
  }
}

/**
 * Constrói o prompt específico para análise de diagnóstico
 */
function buildDiagnosticPrompt(questionnaire: any, userResponses: any[]): string {
  const questionnaireType = questionnaire.type?.toLowerCase() || 'geral';
  
  let prompt = `Você é um consultor empresarial especializado em diagnóstico organizacional. 
Analise as respostas do questionário "${questionnaire.title}" e forneça um diagnóstico empresarial focado nas 8 áreas essenciais de negócio.

QUESTIONÁRIO:
Título: ${questionnaire.title}
Tipo: ${questionnaireType}
Descrição: ${questionnaire.description || 'Não informada'}

RESPOSTAS DO USUÁRIO:
`;

  // Adicionar cada resposta com contexto
  userResponses.forEach((response, index) => {
    const question = questionnaire.questions?.find((q: any) => q.id === response.question_id);
    prompt += `
${index + 1}. Pergunta: ${question?.question || 'Pergunta não encontrada'}
   Resposta: ${response.response}
   Tipo: ${question?.type || 'unknown'}
   Score: ${response.score || 'N/A'}`;
  });

  // Prompt focado nas 8 áreas essenciais empresariais
  prompt += getBusinessAreasPrompt();

  prompt += `

FORMATO DE RESPOSTA OBRIGATÓRIO:
Responda EXATAMENTE no seguinte formato JSON:
{
  "insights": ["insight 1", "insight 2", "insight 3"],
  "recommendations": ["recomendação 1", "recomendação 2", "recomendação 3"],
  "areas_focus": ["área 1", "área 2", "área 3"],
  "score_intelligent": 75,
  "analysis_summary": "Resumo detalhado da análise em 2-3 parágrafos"
}

IMPORTANTE: 
- O score_intelligent deve ser um número de 0 a 100 baseado no impacto empresarial geral
- Forneça insights específicos para as áreas empresariais identificadas
- As recomendações devem ser ações concretas que a empresa pode implementar
- As áreas de foco devem ser das 8 áreas essenciais empresariais (ex: "RH & Pessoas", "Financeiro & Contábil")
- Priorize insights que impactem diretamente nos resultados do negócio`;

  return prompt;
}

/**
 * Retorna prompt focado nas 8 áreas essenciais empresariais
 */
function getBusinessAreasPrompt(): string {
  return `

ANALISE O IMPACTO DAS RESPOSTAS NAS 8 ÁREAS ESSENCIAIS EMPRESARIAIS:

1. FINANCEIRO & CONTÁBIL
   - Gestão de caixa, contas a pagar/receber, orçamento, custos, impostos
   - Saúde financeira é o pilar da sustentabilidade da empresa

2. RECURSOS HUMANOS (RH) & PESSOAS
   - Recrutamento, retenção, clima organizacional, treinamento, cultura
   - Impacta diretamente na motivação e produtividade da equipe

3. MARKETING & COMUNICAÇÃO
   - Posicionamento de marca, publicidade, redes sociais, relacionamento com clientes
   - Essencial para gerar demanda e fortalecer a imagem da empresa

4. COMERCIAL & VENDAS
   - Estratégias de prospecção, funil de vendas, CRM, atendimento ao cliente
   - É onde o marketing se converte em receita efetiva

5. OPERAÇÕES & PRODUÇÃO
   - Processos internos, logística, estoque, qualidade
   - Garante que a entrega de produtos/serviços seja eficiente

6. TECNOLOGIA DA INFORMAÇÃO (TI) & INOVAÇÃO
   - Infraestrutura digital, sistemas de gestão, segurança da informação
   - Hoje, até empresas tradicionais precisam de base tecnológica sólida

7. JURÍDICO & COMPLIANCE
   - Contratos, legislação trabalhista, LGPD, ética nos negócios
   - Evita riscos legais e garante credibilidade

8. ESTRATÉGIA & GESTÃO
   - Planejamento estratégico, governança, métricas (KPIs), tomada de decisão
   - Dá direção para todas as outras áreas

INSTRUÇÕES ESPECÍFICAS:
- Identifique quais dessas 8 áreas são mais impactadas pelas respostas
- Forneça insights específicos para cada área relevante
- Sugira ações concretas que a empresa pode tomar
- Priorize as áreas que precisam de atenção imediata`;
}

/**
 * Processa a resposta da IA e converte para formato estruturado
 */
function parseDiagnosticResponse(response: string): {
  insights: string[];
  recommendations: string[];
  areas_focus: string[];
  score_intelligent: number;
  analysis_summary: string;
} {
  try {
    // Tentar extrair JSON da resposta
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validar e garantir tipos corretos
      return {
        insights: Array.isArray(parsed.insights) ? parsed.insights : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        areas_focus: Array.isArray(parsed.areas_focus) ? parsed.areas_focus : [],
        score_intelligent: typeof parsed.score_intelligent === 'number' ? parsed.score_intelligent : 50,
        analysis_summary: typeof parsed.analysis_summary === 'string' ? parsed.analysis_summary : response
      };
    }
  } catch (error) {
    console.warn('Erro ao parsear resposta da IA, usando fallback:', error);
  }

  // Fallback se não conseguir parsear
  return {
    insights: ['Análise gerada pela IA'],
    recommendations: ['Consulte um especialista para recomendações específicas'],
    areas_focus: ['Áreas identificadas na análise'],
    score_intelligent: 50,
    analysis_summary: response
  };
}
