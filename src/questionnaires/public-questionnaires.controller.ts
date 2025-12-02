import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { QuestionnairesService } from './questionnaires.service';
import { ResponseQuestionnaireDto } from './dto/response-questionnaire.dto';

@Controller('public/questionnaires')
export class PublicQuestionnairesController {
  constructor(private readonly questionnairesService: QuestionnairesService) {}

  @Get('active')
  async getActiveQuestionnaire() {
    try {
      return this.questionnairesService.getActiveQuestionnaire();
    } catch (error) {
      if (error instanceof NotFoundException) {
        // Retornar null em vez de erro para endpoints públicos
        return null;
      }
      throw error;
    }
  }

  @Post(':id/respond')
  async respondPublic(
    @Param('id') questionnaireId: string,
    @Body() responseDto: ResponseQuestionnaireDto,
  ) {
    // Endpoint público para visitantes não logados
    // Retorna dados básicos sem salvar no banco
    try {
      const questionnaire =
        await this.questionnairesService.findOne(questionnaireId);

      if (!questionnaire.is_active) {
        throw new BadRequestException('Questionário não está ativo');
      }

      // Calcular score básico
      const score = this.calculateBasicScore(
        responseDto.responses,
        questionnaire.questions,
      );
      const category = this.getScoreCategory(score);

      return {
        message: 'Diagnóstico calculado com sucesso',
        score,
        category,
        questionnaire: {
          id: questionnaire.id,
          title: questionnaire.title,
          type: questionnaire.type,
        },
        responses: Object.keys(responseDto.responses).length,
        completedAt: new Date(),
        // Dados para salvar no localStorage
        tempData: {
          questionnaire_id: questionnaireId,
          answers: responseDto.responses,
          score,
          category,
          completedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  private calculateBasicScore(
    responses: Record<string, string>,
    questions: any[],
  ): number {
    let totalScore = 0;
    let maxPossibleScore = 0;

    for (const question of questions) {
      const answer = responses[question.id];
      if (answer !== undefined) {
        if (question.type === 'scale') {
          // Para escalas 0-10, usar valor direto
          totalScore += Number(answer);
          maxPossibleScore += 10;
        } else if (question.type === 'multiple_choice' && question.options) {
          // Para múltipla escolha, usar score da opção
          const option = question.options.find(
            (opt: any) => opt.value === answer,
          );
          totalScore += option?.score || 0;
          maxPossibleScore += Math.max(
            ...question.options.map((opt: any) => opt.score),
          );
        } else {
          // Para outras perguntas, usar valor como número ou score padrão
          totalScore += Number(answer) || 3;
          maxPossibleScore += 10;
        }
      }
    }

    if (maxPossibleScore === 0) return 0;
    return Math.round((totalScore / maxPossibleScore) * 100);
  }

  private getScoreCategory(score: number) {
    if (score >= 80) return 'Excelente';
    if (score >= 60) return 'Bom';
    if (score >= 40) return 'Regular';
    return 'Crítico';
  }
}
