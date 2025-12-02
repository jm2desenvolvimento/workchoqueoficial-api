import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '@prisma/client';
import { analyzeWithGemini } from '../IAs/gemini';
import { AgentContext, AgentResponse } from './types';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async ensureSession(userId: string): Promise<string> {
    const open = await this.prisma.chat_session.findFirst({
      where: { owner_user_id: userId, status: 'open' },
      select: { id: true },
    });
    if (open) {
      console.log('[ChatService][ensureSession] found open session:', open.id);
      return open.id;
    }
    const created = await this.prisma.chat_session.create({
      data: {
        scope: 'personal',
        owner_user_id: userId,
        created_by: userId,
        status: 'open',
        title: 'Sessão do Agente',
      },
    });
    console.log('[ChatService][ensureSession] created session:', created.id);
    return created.id;
  }

  async appendUserMessage(sessionId: string, userId: string, message: string) {
    console.log(
      '[ChatService][appendUserMessage] sessionId:',
      sessionId,
      'userId:',
      userId,
      'len:',
      typeof message === 'string' ? message.length : 0,
    );
    await this.prisma.chat_message.create({
      data: {
        session_id: sessionId,
        sender_type: 'user',
        sender_id: userId,
        content: { text: message } as Prisma.InputJsonValue,
      },
    });
  }

  async appendAgentMessage(sessionId: string, response: AgentResponse) {
    const responseJson = JSON.parse(
      JSON.stringify(response),
    ) as Prisma.InputJsonValue;
    const contextUsedJson = JSON.parse(
      JSON.stringify(response.context_used ?? []),
    ) as Prisma.InputJsonValue;
    await this.prisma.chat_message.create({
      data: {
        session_id: sessionId,
        sender_type: 'agent',
        content: responseJson,
        intent: response.recommended_actions?.[0]?.intent,
        context_used: contextUsedJson,
      },
    });
    console.log(
      '[ChatService][appendAgentMessage] sessionId:',
      sessionId,
      'intent:',
      response.recommended_actions?.[0]?.intent || null,
      'ctxUsed:',
      (response.context_used || []).length,
    );
  }

  buildPrompt(context: AgentContext, userMessage: string): string {
    return `
Você é o Agente WorkChoque. Siga regras: mentor experiente, linguagem simples, empático, orientado para ação; nunca invente dados; sempre inclua próximos passos com rotas; saída JSON com: direct_answer, simple_explanation, plan_connection, recommended_actions, motivation, follow_up_question, context_used.

CONTEXT:
${JSON.stringify(context)}

USER_MESSAGE:
${userMessage}

OUTPUT_SCHEMA:
{
  "direct_answer": "...",
  "simple_explanation": "...",
  "plan_connection": "...",
  "recommended_actions": [
    { "label": "Continuar Plano", "route": "/planos-acao", "intent": "continue_plan" }
  ],
  "motivation": "...",
  "follow_up_question": "...",
  "context_used": ["diagnostic","actionPlan"]
}
`.trim();
  }

  parseAgentResponse(text: string): AgentResponse {
    try {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}') + 1;
      const json = text.substring(start, end);
      const parsed = JSON.parse(json) as AgentResponse;
      console.log(
        '[ChatService][parseAgentResponse] jsonLen:',
        json.length,
        'keys:',
        Object.keys(parsed).length,
      );
      return parsed;
    } catch {
      console.warn('[ChatService][parseAgentResponse] fallback used');
      return {
        direct_answer: typeof text === 'string' ? text : 'OK',
        simple_explanation: 'Sugestões geradas com base nos seus dados atuais.',
        plan_connection: undefined,
        recommended_actions: [],
        motivation: 'Vamos avançar passo a passo.',
        follow_up_question: 'Deseja focar em metas ou conteúdos agora?',
        context_used: [],
      };
    }
  }

  async chatWithAgent(
    context: AgentContext,
    sessionId: string,
    userMessage: string,
  ): Promise<AgentResponse> {
    try {
      const prompt = this.buildPrompt(context, userMessage);
      console.log(
        '[ChatService][chatWithAgent] promptLen:',
        prompt.length,
        'ctxDiag:',
        !!context.diagnostic,
        'ctxPlan:',
        !!context.actionPlan,
      );
      const aiText = await analyzeWithGemini(prompt);
      console.log(
        '[ChatService][chatWithAgent] aiTextLen:',
        typeof aiText === 'string' ? aiText.length : 0,
      );
      const response = this.parseAgentResponse(aiText);
      await this.appendAgentMessage(sessionId, response);
      return response;
    } catch (error: any) {
      console.error('[ChatService][chatWithAgent] error:', error?.message);
      const used: string[] = [];
      if (context.diagnostic) used.push('diagnostic');
      if (context.actionPlan) used.push('actionPlan');
      if (context.goals && context.goals.length) used.push('goals');
      if (context.contents && context.contents.length) used.push('contents');
      const fallback: AgentResponse = {
        direct_answer:
          'Não consegui consultar a IA agora. Baseado no seu contexto, recomendo revisar suas metas e seguir com o plano de ação.',
        simple_explanation:
          'Use o plano atual e conteúdos recomendados para avançar.',
        plan_connection: context.actionPlan
          ? `Plano: ${context.actionPlan.title}`
          : undefined,
        recommended_actions: [
          {
            label: 'Abrir Plano de Ação',
            route: '/planos-acao',
            intent: 'open_plan',
          },
          {
            label: 'Ver Conteúdos',
            route: '/conteudos',
            intent: 'view_contents',
          },
        ],
        motivation:
          'Você já tem progresso. Pequenos passos constantes geram resultado.',
        follow_up_question:
          'Prefere trabalhar em uma meta específica ou ver conteúdos?',
        context_used: used,
      };
      await this.appendAgentMessage(sessionId, fallback);
      return fallback;
    }
  }
}
