import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Req, 
  Query,
  HttpStatus
} from '@nestjs/common';
import { ActionPlansService } from './action-plans.service';
import { CreateActionPlanDto } from './dto/create-action-plan.dto';
import { UpdateActionPlanDto } from './dto/update-action-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { 
  ApiBearerAuth, 
  ApiOperation, 
  ApiResponse, 
  ApiTags, 
  ApiBody, 
  ApiParam, 
  ApiQuery 
} from '@nestjs/swagger';
import { Request } from 'express';
import { ActionPlanWithRelations } from './types/action-plan.types';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    // Adicione outras propriedades do usuário conforme necessário
  };
}

/**
 * Controlador para gerenciar Planos de Ação
 */
@ApiTags('Planos de Ação')
@ApiBearerAuth('JWT')
@Controller('action-plans')
@UseGuards(JwtAuthGuard)
export class ActionPlansController {
  constructor(private readonly actionPlansService: ActionPlansService) {}

  /**
   * Cria um novo Plano de Ação
   * @param createActionPlanDto Dados para criação do Plano de Ação
   * @param req Requisição HTTP
   * @returns O Plano de Ação criado
   */
  @Post()
  @ApiOperation({ summary: 'Criar um novo plano de ação' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Plano de ação criado com sucesso',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        user_id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string', nullable: true },
        category: { type: 'string' },
        status: { type: 'string' },
        priority: { type: 'string' },
        progress: { type: 'number' },
        start_date: { type: 'string', format: 'date-time', nullable: true },
        due_date: { type: 'string', format: 'date-time', nullable: true },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        diagnostic_id: { type: 'string', nullable: true }
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Dados inválidos' 
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Não autorizado' 
  })
  @ApiBody({ type: CreateActionPlanDto })
  async create(
    @Body() createActionPlanDto: CreateActionPlanDto, 
    @Req() req: RequestWithUser
  ): Promise<ActionPlanWithRelations> {
    return this.actionPlansService.create(createActionPlanDto, req.user.id);
  }

  /**
   * Lista todos os Planos de Ação do usuário
   * @param req Requisição HTTP
   * @param status Filtro opcional por status
   * @param category Filtro opcional por categoria
   * @param priority Filtro opcional por prioridade
   * @returns Lista de Planos de Ação
   */
  @Get()
  @ApiOperation({ summary: 'Listar todos os planos de ação do usuário' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Lista de planos de ação',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          user_id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          category: { type: 'string' },
          status: { type: 'string' },
          priority: { type: 'string' },
          progress: { type: 'number' },
          start_date: { type: 'string', format: 'date-time', nullable: true },
          due_date: { type: 'string', format: 'date-time', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
          diagnostic_id: { type: 'string', nullable: true },
          goals: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string', nullable: true },
                status: { type: 'string' },
                priority: { type: 'string' },
                progress: { type: 'number' },
                start_date: { type: 'string', format: 'date-time', nullable: true },
                due_date: { type: 'string', format: 'date-time', nullable: true },
                action_plan_id: { type: 'string' },
                created_at: { type: 'string', format: 'date-time' },
                updated_at: { type: 'string', format: 'date-time' }
              }
            }
          },
          diagnostic: { type: 'object' }
        }
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Não autorizado' 
  })
  @ApiQuery({ name: 'status', required: false, isArray: true })
  @ApiQuery({ name: 'category', required: false, isArray: true })
  @ApiQuery({ name: 'priority', required: false, isArray: true })
  async findAllByUser(
    @Req() req: RequestWithUser,
    @Query('status') status?: string | string[],
    @Query('category') category?: string | string[],
    @Query('priority') priority?: string | string[]
  ): Promise<ActionPlanWithRelations[]> {
    // Garante que os parâmetros sejam arrays
    const statusArray = status ? (Array.isArray(status) ? status : [status]) : undefined;
    const categoryArray = category ? (Array.isArray(category) ? category : [category]) : undefined;
    const priorityArray = priority ? (Array.isArray(priority) ? priority : [priority]) : undefined;

    return this.actionPlansService.findAllByUser(req.user.id, {
      status: statusArray,
      category: categoryArray,
      priority: priorityArray,
    });
  }

  /**
   * Obtém um Plano de Ação pelo ID
   * @param id ID do Plano de Ação
   * @param req Requisição HTTP
   * @returns O Plano de Ação encontrado
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obter um plano de ação pelo ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Plano de ação encontrado',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        user_id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string', nullable: true },
        category: { type: 'string' },
        status: { type: 'string' },
        priority: { type: 'string' },
        progress: { type: 'number' },
        start_date: { type: 'string', format: 'date-time', nullable: true },
        due_date: { type: 'string', format: 'date-time', nullable: true },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        diagnostic_id: { type: 'string', nullable: true },
        goals: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string', nullable: true },
              status: { type: 'string' },
              priority: { type: 'string' },
              progress: { type: 'number' },
              start_date: { type: 'string', format: 'date-time', nullable: true },
              due_date: { type: 'string', format: 'date-time', nullable: true },
              action_plan_id: { type: 'string' },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' }
            }
          }
        },
        diagnostic: { type: 'object' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 404, description: 'Plano de ação não encontrado' })
  async findOne(
    @Param('id') id: string, 
    @Req() req: RequestWithUser
  ): Promise<ActionPlanWithRelations> {
    return this.actionPlansService.findOne(id, req.user.id);
  }

  /**
   * Atualiza um Plano de Ação existente
   * @param id ID do Plano de Ação
   * @param updateActionPlanDto Dados para atualização do Plano de Ação
   * @param req Requisição HTTP
   * @returns O Plano de Ação atualizado
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar um plano de ação' })
  @ApiResponse({ 
    status: 200, 
    description: 'Plano de ação atualizado com sucesso',
    type: UpdateActionPlanDto
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'Plano de ação não encontrado' })
  @ApiParam({ name: 'id', description: 'ID do Plano de Ação' })
  @ApiBody({ type: UpdateActionPlanDto })
  async update(
    @Param('id') id: string,
    @Body() updateActionPlanDto: UpdateActionPlanDto,
    @Req() req: RequestWithUser,
  ): Promise<ActionPlanWithRelations> {
    return this.actionPlansService.update(id, updateActionPlanDto, req.user.id);
  }

  /**
   * Remove um Plano de Ação existente
   * @param id ID do Plano de Ação
   * @param req Requisição HTTP
   * @returns O ID do Plano de Ação removido
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Remove um plano de ação' })
  @ApiResponse({ status: 200, description: 'Plano de ação removido com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'Plano de ação não encontrado' })
  async remove(
    @Param('id') id: string,
    @Req() req: RequestWithUser
  ): Promise<{ id: string }> {
    return this.actionPlansService.remove(id, req.user.id);
  }
}
