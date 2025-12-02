import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ContextService } from './context.service';
import { ChatService } from './chat.service';
import { AgentResponse } from './types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('agent')
@UseGuards(JwtAuthGuard)
export class AgentController {
  constructor(
    private contextService: ContextService,
    private chatService: ChatService,
  ) {}

  @Get('context')
  async getContext(@Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const role = (req.user?.role || 'user') as 'user' | 'admin' | 'master';
    const allowed = req.user?.allowed as Record<string, boolean> | undefined;
    const permissions = (req.user?.permissions || []) as string[];
    const canView =
      role === 'master' ||
      role === 'admin' ||
      permissions.includes('agent.chat.view') ||
      allowed?.['agent.chat.view'];
    console.log(
      '[AgentController][getContext] user:',
      userId,
      'role:',
      role,
      'canView:',
      canView,
      'permCount:',
      permissions.length,
    );
    if (!canView)
      throw new ForbiddenException('Permissão necessária: agent.chat.view');
    const ctx = await this.contextService.getUserAgentContext(userId, role);
    console.log(
      '[AgentController][getContext] ctx.diagnostic:',
      !!ctx.diagnostic,
      'ctx.actionPlan:',
      !!ctx.actionPlan,
      'goals:',
      ctx.goals?.length || 0,
      'contents:',
      ctx.contents?.length || 0,
    );
    return ctx;
  }

  @Post('chat')
  async chat(
    @Req() req: any,
    @Body('message') message: string,
  ): Promise<AgentResponse> {
    const userId = req.user?.sub || req.user?.id;
    const role = (req.user?.role || 'user') as 'user' | 'admin' | 'master';
    const allowed = req.user?.allowed as Record<string, boolean> | undefined;
    const permissions = (req.user?.permissions || []) as string[];
    const canChat =
      role === 'master' ||
      role === 'admin' ||
      permissions.includes('agent.chat.view') ||
      allowed?.['agent.chat.view'];
    if (!canChat)
      throw new ForbiddenException('Permissão necessária: agent.chat.view');
    console.log(
      '[AgentController][chat] user:',
      userId,
      'role:',
      role,
      'canChat:',
      canChat,
      'messageLen:',
      typeof message === 'string' ? message.length : 0,
    );
    try {
      const context = await this.contextService.getUserAgentContext(
        userId,
        role,
      );
      const sessionId = await this.chatService.ensureSession(userId);
      console.log(
        '[AgentController][chat] sessionId:',
        sessionId,
        'ctxDiag:',
        !!context.diagnostic,
        'ctxPlan:',
        !!context.actionPlan,
      );
      await this.chatService.appendUserMessage(sessionId, userId, message);
      const resp = await this.chatService.chatWithAgent(
        context,
        sessionId,
        message,
      );
      console.log(
        '[AgentController][chat] response fields:',
        Object.keys(resp),
      );
      return resp;
    } catch (error: any) {
      console.error('[AgentController][chat] error:', error?.message);
      const context = await this.contextService.getUserAgentContext(
        userId,
        role,
      );
      const used: string[] = [];
      if (context.diagnostic) used.push('diagnostic');
      if (context.actionPlan) used.push('actionPlan');
      if (context.goals && context.goals.length) used.push('goals');
      if (context.contents && context.contents.length) used.push('contents');
      return {
        direct_answer:
          'Não foi possível consultar a IA neste momento. Com base no seu contexto, siga com seu plano de ação ou veja conteúdos recomendados.',
        simple_explanation:
          'Houve um erro interno ao processar sua mensagem. Tente novamente em instantes.',
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
        motivation: 'Continuar avançando passo a passo é o melhor caminho.',
        follow_up_question: 'Deseja focar em metas ou em conteúdos agora?',
        context_used: used,
      };
    }
  }
}
