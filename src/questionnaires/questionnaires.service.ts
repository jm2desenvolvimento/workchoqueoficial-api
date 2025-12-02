import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionnaireDto } from './dto/create-questionnaire.dto';
import { UpdateQuestionnaireDto } from './dto/update-questionnaire.dto';
import { ResponseQuestionnaireDto } from './dto/response-questionnaire.dto';
import { generateDiagnostic, generateActionPlan } from '../IAs/gemini';
import { ActionPlansService } from '../action-plans/action-plans.service';

@Injectable()
export class QuestionnairesService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ActionPlansService))
    private actionPlansService: ActionPlansService,
  ) {}

  async create(createQuestionnaireDto: CreateQuestionnaireDto, userId: string) {
    const { questions, ...questionnaireData } = createQuestionnaireDto;

    // Criar questionário
    const questionnaire = await this.prisma.questionnaire.create({
      data: {
        ...questionnaireData,
        created_by: userId,
      },
    });

    // Criar perguntas e opções
    for (const questionData of questions) {
      const { options, ...questionInfo } = questionData;

      const question = await this.prisma.questionnaire_question.create({
        data: {
          ...questionInfo,
          questionnaire_id: questionnaire.id,
        },
      });

      // Criar opções da pergunta
      if (options && options.length > 0) {
        for (const optionData of options) {
          await this.prisma.questionnaire_option.create({
            data: {
              ...optionData,
              question_id: question.id,
            },
          });
        }
      }
    }

    return this.findOne(questionnaire.id);
  }

  async findAll(userRole: string) {
    const where = userRole === 'master' ? {} : { is_active: true };

    return this.prisma.questionnaire.findMany({
      where,
      include: {
        questions: {
          include: {
            options: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
        _count: {
          select: {
            responses: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const questionnaire = await this.prisma.questionnaire.findUnique({
      where: { id },
      include: {
        questions: {
          include: {
            options: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
        _count: {
          select: {
            responses: true,
          },
        },
      },
    });

    if (!questionnaire) {
      throw new NotFoundException('Questionário não encontrado');
    }

    return questionnaire;
  }

  async update(
    id: string,
    updateQuestionnaireDto: UpdateQuestionnaireDto,
    userId: string,
    userRole: string,
  ) {
    const questionnaire = await this.findOne(id);

    // Verificar se o usuário pode editar (master ou admin que criou)
    if (userRole !== 'master' && questionnaire.created_by !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para editar este questionário',
      );
    }

    const { questions, ...questionnaireData } = updateQuestionnaireDto;

    // Atualizar dados do questionário
    const updatedQuestionnaire = await this.prisma.questionnaire.update({
      where: { id },
      data: questionnaireData,
    });

    // Se há perguntas para atualizar, recriar todas
    if (questions) {
      // Deletar perguntas existentes (cascade deletará opções e respostas)
      await this.prisma.questionnaire_question.deleteMany({
        where: { questionnaire_id: id },
      });

      // Criar novas perguntas
      for (const questionData of questions) {
        const { options, ...questionInfo } = questionData;

        const question = await this.prisma.questionnaire_question.create({
          data: {
            question: questionInfo.question!,
            type: questionInfo.type!,
            order: questionInfo.order!,
            required: questionInfo.required ?? true,
            is_active: questionInfo.is_active ?? true,
            questionnaire_id: id,
          },
        });

        // Criar opções da pergunta
        if (options && options.length > 0) {
          for (const optionData of options) {
            await this.prisma.questionnaire_option.create({
              data: {
                value: optionData.value!,
                label: optionData.label!,
                score: optionData.score ?? 1,
                order: optionData.order!,
                question_id: question.id,
              },
            });
          }
        }
      }
    }

    return this.findOne(id);
  }

  async remove(id: string, userId: string, userRole: string) {
    const questionnaire = await this.findOne(id);

    // Verificar se o usuário pode deletar (apenas master)
    if (userRole !== 'master') {
      throw new ForbiddenException(
        'Apenas usuários master podem deletar questionários',
      );
    }

    // Verificar se há respostas (evitar deletar questionários com dados)
    const responseCount = await this.prisma.questionnaire_response.count({
      where: { questionnaire_id: id },
    });

    if (responseCount > 0) {
      throw new ForbiddenException(
        'Não é possível deletar questionário com respostas existentes',
      );
    }

    await this.prisma.questionnaire.delete({
      where: { id },
    });

    return { message: 'Questionário deletado com sucesso' };
  }

  async respond(
    questionnaireId: string,
    responseDto: ResponseQuestionnaireDto,
    userId: string,
  ) {
    // Verificar se o questionário existe e está ativo
    const questionnaire = await this.prisma.questionnaire.findFirst({
      where: {
        id: questionnaireId,
        is_active: true,
      },
      include: {
        questions: {
          include: {
            options: true,
          },
        },
      },
    });

    if (!questionnaire) {
      throw new NotFoundException('Questionário não encontrado ou inativo');
    }

    // Verificar se o usuário já respondeu este questionário
    const existingResponse = await this.prisma.questionnaire_response.findFirst(
      {
        where: {
          user_id: userId,
          questionnaire_id: questionnaireId,
        },
      },
    );

    if (existingResponse) {
      throw new ForbiddenException(
        'Você já respondeu este questionário. Cada usuário pode responder apenas uma vez.',
      );
    }

    // Usar lógica comum de processamento
    return this.processQuestionnaireResponse(
      questionnaireId,
      responseDto,
      userId,
      questionnaire,
    );
  }

  async transferFromPublic(
    questionnaireId: string,
    responseDto: ResponseQuestionnaireDto,
    userId: string,
  ) {
    // Método especial para transferir respostas de visitantes após cadastro
    // NÃO verifica duplicatas pois é uma transferência legítima

    // Verificar se o questionário existe e está ativo
    const questionnaire = await this.prisma.questionnaire.findFirst({
      where: {
        id: questionnaireId,
        is_active: true,
      },
      include: {
        questions: {
          include: {
            options: true,
          },
        },
      },
    });

    if (!questionnaire) {
      throw new NotFoundException('Questionário não encontrado ou inativo');
    }

    // IMPORTANTE: Deletar respostas existentes se houver (limpeza)
    await this.prisma.questionnaire_response.deleteMany({
      where: {
        user_id: userId,
        questionnaire_id: questionnaireId,
      },
    });

    // Deletar diagnósticos existentes se houver
    await this.prisma.diagnostic.deleteMany({
      where: {
        user_id: userId,
        questionnaire_id: questionnaireId,
      },
    });

    // Agora processar como se fosse a primeira vez
    return this.processQuestionnaireResponse(
      questionnaireId,
      responseDto,
      userId,
      questionnaire,
    );
  }

  // Extrair lógica comum de processamento
  private async processQuestionnaireResponse(
    questionnaireId: string,
    responseDto: ResponseQuestionnaireDto,
    userId: string,
    questionnaire: any,
  ) {
    // Validar e salvar respostas
    const responses: any[] = [];
    let totalScore = 0;

    for (const [questionId, answer] of Object.entries(responseDto.responses)) {
      const question = questionnaire.questions.find((q) => q.id === questionId);

      if (!question) {
        throw new NotFoundException(`Pergunta ${questionId} não encontrada`);
      }

      // Calcular score simples (para escalas numéricas)
      let score: number | null = null;
      if (question.type === 'scale' && !isNaN(Number(answer))) {
        score = Number(answer);
        totalScore += score;
      }

      const response = await this.prisma.questionnaire_response.create({
        data: {
          user_id: userId,
          questionnaire_id: questionnaireId,
          question_id: questionId,
          response: answer,
          score,
        },
      });

      responses.push(response);
    }

    // Calcular score básico (mantido para compatibilidade)
    const totalQuestions = responses.length;
    const maxScore = totalQuestions * 5;
    const basicScore = Math.round((totalScore / maxScore) * 100);
    const category = this.getScoreCategory(basicScore);

    // Criar diagnóstico inicial com status "processing"
    let processingDiagnostic;
    try {
      processingDiagnostic = await this.prisma.diagnostic.create({
        data: {
          questionnaire_id: questionnaireId,
          user_id: userId,
          analysis_data: {
            basic_score: basicScore,
            category: category,
            totalQuestions: totalQuestions,
            answeredQuestions: responses.length,
          },
          insights: ['Analisando respostas...'],
          recommendations: ['Gerando recomendações...'],
          areas_focus: ['Processando...'],
          score_intelligent: basicScore,
          status: 'processing',
        },
      });

      // Gerar diagnóstico inteligente com IA
      const aiDiagnostic = await generateDiagnostic(questionnaire, responses);

      // Atualizar diagnóstico com resultado da IA
      const diagnostic = await this.prisma.diagnostic.update({
        where: { id: processingDiagnostic.id },
        data: {
          analysis_data: {
            basic_score: basicScore,
            category: category,
            totalQuestions: totalQuestions,
            answeredQuestions: responses.length,
            ai_analysis: aiDiagnostic.analysis_summary,
          },
          insights: aiDiagnostic.insights,
          recommendations: aiDiagnostic.recommendations,
          areas_focus: aiDiagnostic.areas_focus,
          score_intelligent: aiDiagnostic.score_intelligent,
          status: 'completed',
          completed_at: new Date(),
        },
        include: {
          questionnaire: true,
          user: true,
        },
      });

      // Gerar Plano de Ação automaticamente a partir do diagnóstico
      try {
        await this.actionPlansService.generateFromDiagnostic(
          diagnostic.id,
          userId,
        );
      } catch (error) {
        console.error('Erro ao gerar Plano de Ação automaticamente:', error);
        // Não interrompemos o fluxo em caso de erro na geração do plano de ação
      }

      return {
        message: 'Diagnóstico transferido e processado com sucesso',
        diagnostic: {
          id: diagnostic.id,
          score: aiDiagnostic.score_intelligent,
          category: this.getScoreCategory(aiDiagnostic.score_intelligent),
          insights: diagnostic.insights,
          recommendations: diagnostic.recommendations,
          areas_focus: diagnostic.areas_focus,
        },
        responses: responses.length,
        completedAt: new Date(),
      };
    } catch (aiError) {
      console.error(
        'Erro na análise IA durante transferência, usando fallback básico:',
        aiError,
      );

      // Fallback para lógica básica em caso de erro da IA
      const basicInsights = this.generateBasicInsights(basicScore, category);

      // Tentar atualizar diagnóstico existente ou criar novo se não existir
      let diagnostic;
      try {
        if (processingDiagnostic) {
          diagnostic = await this.prisma.diagnostic.update({
            where: { id: processingDiagnostic.id },
            data: {
              analysis_data: {
                basic_score: basicScore,
                category: category,
                totalQuestions: totalQuestions,
                answeredQuestions: responses.length,
                error: 'IA indisponível, usando análise básica',
              },
              insights: basicInsights.recommendations,
              recommendations: basicInsights.recommendations,
              areas_focus: basicInsights.areas_for_improvement,
              score_intelligent: basicScore,
              status: 'completed',
              completed_at: new Date(),
            },
          });
        } else {
          throw new Error('Diagnóstico inicial não foi criado');
        }
      } catch (updateError) {
        // Se não conseguir atualizar, criar novo
        diagnostic = await this.prisma.diagnostic.create({
          data: {
            questionnaire_id: questionnaireId,
            user_id: userId,
            analysis_data: {
              basic_score: basicScore,
              category: category,
              totalQuestions: totalQuestions,
              answeredQuestions: responses.length,
              error: 'IA indisponível, usando análise básica',
            },
            insights: basicInsights.recommendations,
            recommendations: basicInsights.recommendations,
            areas_focus: basicInsights.areas_for_improvement,
            score_intelligent: basicScore,
            status: 'completed',
            completed_at: new Date(),
          },
        });
      }

      return {
        message: 'Diagnóstico transferido com análise básica',
        diagnostic: {
          id: diagnostic.id,
          score: basicScore,
          category: category,
          insights: diagnostic.insights,
        },
        responses: responses.length,
        completedAt: new Date(),
      };
    }
  }

  async getUserResponses(userId: string) {
    return this.prisma.questionnaire_response.findMany({
      where: { user_id: userId },
      include: {
        questionnaire: {
          select: {
            title: true,
            type: true,
          },
        },
        question: {
          select: {
            question: true,
            type: true,
          },
        },
      },
      orderBy: {
        completed_at: 'desc',
      },
    });
  }

  async getQuestionnaireResponses(questionnaireId: string, userRole: string) {
    if (userRole === 'user') {
      throw new ForbiddenException(
        'Usuários não podem ver respostas de outros',
      );
    }

    return this.prisma.questionnaire_response.findMany({
      where: { questionnaire_id: questionnaireId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        question: {
          select: {
            question: true,
            type: true,
          },
        },
      },
      orderBy: {
        completed_at: 'desc',
      },
    });
  }

  async getStatistics(questionnaireId?: string) {
    const where = questionnaireId ? { questionnaire_id: questionnaireId } : {};

    const [totalResponses, averageScore, responseCount] = await Promise.all([
      this.prisma.questionnaire_response.count({ where }),
      this.prisma.questionnaire_response.aggregate({
        where: { ...where, score: { not: null } },
        _avg: { score: true },
      }),
      this.prisma.questionnaire_response.groupBy({
        by: ['questionnaire_id'],
        where,
        _count: { questionnaire_id: true },
      }),
    ]);

    return {
      totalResponses,
      averageScore: averageScore._avg.score || 0,
      uniqueRespondents: responseCount.length,
    };
  }

  async getActiveQuestionnaire() {
    const questionnaire = await this.prisma.questionnaire.findFirst({
      where: { is_active: true },
      include: {
        questions: {
          include: {
            options: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!questionnaire) {
      throw new NotFoundException('Nenhum questionário ativo encontrado');
    }

    return questionnaire;
  }

  async toggleActive(id: string, userId: string, userRole: string) {
    const questionnaire = await this.findOne(id);

    // Verificar se o usuário pode ativar/desativar (master ou admin que criou)
    if (userRole !== 'master' && questionnaire.created_by !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para ativar/desativar este questionário',
      );
    }

    // Verificar se o questionário tem perguntas
    const questionCount = await this.prisma.questionnaire_question.count({
      where: { questionnaire_id: id },
    });

    if (questionCount === 0) {
      throw new ForbiddenException(
        'Questionário deve ter pelo menos uma pergunta para ser ativado',
      );
    }

    if (questionnaire.is_active) {
      // Desativar questionário
      return this.prisma.questionnaire.update({
        where: { id },
        data: { is_active: false },
      });
    } else {
      // Ativar questionário (desativa todos os outros)
      await this.prisma.questionnaire.updateMany({
        where: { is_active: true },
        data: { is_active: false },
      });

      return this.prisma.questionnaire.update({
        where: { id },
        data: { is_active: true },
      });
    }
  }

  private getScoreCategory(score: number): string {
    if (score >= 80) return 'Excelente';
    if (score >= 60) return 'Bom';
    if (score >= 40) return 'Regular';
    return 'Crítico';
  }

  private generateBasicInsights(score: number, category: string) {
    // Insights básicos - futuramente será substituído por IA
    const insights = {
      recommendations: [] as string[],
      areas_for_improvement: [] as string[],
    };

    switch (category) {
      case 'Excelente':
        insights.recommendations = [
          'Continue mantendo os padrões atuais',
          'Compartilhe as melhores práticas com outras equipes',
          'Monitore regularmente para manter a excelência',
        ];
        break;

      case 'Bom':
        insights.recommendations = [
          'Identifique áreas específicas para melhorar',
          'Implemente feedback regular da equipe',
          'Foque em comunicação e reconhecimento',
        ];
        insights.areas_for_improvement = ['Comunicação', 'Reconhecimento'];
        break;

      case 'Regular':
        insights.recommendations = [
          'Priorize melhorias na comunicação',
          'Implemente programa de reconhecimento',
          'Avalie políticas de trabalho',
        ];
        insights.areas_for_improvement = [
          'Comunicação',
          'Reconhecimento',
          'Ambiente de trabalho',
        ];
        break;

      case 'Crítico':
        insights.recommendations = [
          'Ação imediata necessária',
          'Revisão completa das políticas',
          'Suporte profissional recomendado',
        ];
        insights.areas_for_improvement = ['Todas as áreas avaliadas'];
        break;
    }

    return insights;
  }
}
