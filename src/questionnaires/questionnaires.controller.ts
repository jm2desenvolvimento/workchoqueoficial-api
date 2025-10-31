import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { QuestionnairesService } from './questionnaires.service';
import { CreateQuestionnaireDto } from './dto/create-questionnaire.dto';
import { UpdateQuestionnaireDto } from './dto/update-questionnaire.dto';
import { ResponseQuestionnaireDto } from './dto/response-questionnaire.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('questionnaires')
@UseGuards(JwtAuthGuard)
export class QuestionnairesController {
  constructor(private readonly questionnairesService: QuestionnairesService) {}

  @Post()
  async create(@Body() createQuestionnaireDto: CreateQuestionnaireDto, @Request() req) {
    // Verificar permissão: apenas master e admin podem criar questionários
    if (!['master', 'admin'].includes(req.user.role)) {
      throw new ForbiddenException('Apenas masters e admins podem criar questionários');
    }

    return this.questionnairesService.create(createQuestionnaireDto, req.user.id);
  }

  @Get()
  async findAll(@Request() req, @Query('type') type?: string) {
    const questionnaires = await this.questionnairesService.findAll(req.user.role);
    
    // Filtrar por tipo se especificado
    if (type) {
      return questionnaires.filter(q => q.type === type);
    }
    
    return questionnaires;
  }

  @Get('statistics')
  async getStatistics(@Query('questionnaire_id') questionnaireId?: string) {
    return this.questionnairesService.getStatistics(questionnaireId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.questionnairesService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateQuestionnaireDto: UpdateQuestionnaireDto,
    @Request() req,
  ) {
    // Verificar permissão: apenas master e admin podem editar questionários
    if (!['master', 'admin'].includes(req.user.role)) {
      throw new ForbiddenException('Apenas masters e admins podem editar questionários');
    }

    return this.questionnairesService.update(id, updateQuestionnaireDto, req.user.id, req.user.role);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    // Verificar permissão: apenas master pode deletar questionários
    if (req.user.role !== 'master') {
      throw new ForbiddenException('Apenas masters podem deletar questionários');
    }

    return this.questionnairesService.remove(id, req.user.id, req.user.role);
  }

  @Post(':id/respond')
  async respond(
    @Param('id') questionnaireId: string,
    @Body() responseDto: ResponseQuestionnaireDto,
    @Request() req,
  ) {
    return this.questionnairesService.respond(questionnaireId, responseDto, req.user.id);
  }

  @Post(':id/transfer')
  async transferFromPublic(
    @Param('id') questionnaireId: string,
    @Body() responseDto: ResponseQuestionnaireDto,
    @Request() req,
  ) {
    return this.questionnairesService.transferFromPublic(questionnaireId, responseDto, req.user.id);
  }

  @Get('my/responses')
  async getMyResponses(@Request() req) {
    return this.questionnairesService.getUserResponses(req.user.id);
  }

  @Get(':id/responses')
  async getQuestionnaireResponses(@Param('id') questionnaireId: string, @Request() req) {
    return this.questionnairesService.getQuestionnaireResponses(questionnaireId, req.user.role);
  }


  @Patch(':id/toggle-active')
  async toggleActive(@Param('id') id: string, @Request() req) {
    // Verificar permissão: apenas master e admin podem ativar/desativar questionários
    if (!['master', 'admin'].includes(req.user.role)) {
      throw new ForbiddenException('Apenas masters e admins podem ativar/desativar questionários');
    }

    return this.questionnairesService.toggleActive(id, req.user.id, req.user.role);
  }
}
