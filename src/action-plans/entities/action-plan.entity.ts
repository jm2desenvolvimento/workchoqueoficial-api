import { ApiProperty } from '@nestjs/swagger';
import { Goal } from './goal.entity';

export class ActionPlan {
  @ApiProperty({ description: 'ID do Plano de Ação' })
  id: string;

  @ApiProperty({ description: 'ID do usuário dono do plano' })
  user_id: string;

  @ApiProperty({ description: 'Título do Plano de Ação' })
  title: string;

  @ApiProperty({ description: 'Descrição detalhada do plano', required: false })
  description?: string;

  @ApiProperty({
    description: 'Categoria do plano',
    enum: ['leadership', 'wellness', 'development', 'performance', 'career'],
  })
  category: string;

  @ApiProperty({
    description: 'Status do plano',
    enum: ['rascunho', 'em_andamento', 'pausado', 'concluido', 'cancelado'],
  })
  status: string;

  @ApiProperty({
    description: 'Prioridade do plano',
    enum: ['baixa', 'media', 'alta'],
  })
  priority: string;

  @ApiProperty({
    description: 'Progresso geral do plano (0-100)',
    minimum: 0,
    maximum: 100,
  })
  progress: number;

  @ApiProperty({
    description: 'Data de início do plano',
    type: 'string',
    format: 'date-time',
  })
  start_date?: Date;

  @ApiProperty({
    description: 'Data de conclusão prevista',
    type: 'string',
    format: 'date-time',
  })
  due_date?: Date;

  @ApiProperty({
    description: 'ID do diagnóstico relacionado',
    required: false,
  })
  diagnostic_id?: string;

  @ApiProperty({
    description: 'Data de criação',
    type: 'string',
    format: 'date-time',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Data da última atualização',
    type: 'string',
    format: 'date-time',
  })
  updated_at: Date;

  @ApiProperty({
    description: 'Metas do Plano de Ação',
    type: [Goal],
    required: false,
  })
  goals?: Goal[];
}
