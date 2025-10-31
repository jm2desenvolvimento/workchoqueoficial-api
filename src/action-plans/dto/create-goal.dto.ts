import { ApiProperty } from '@nestjs/swagger';

export class CreateGoalDto {
  @ApiProperty({ description: 'Título da meta' })
  title: string;

  @ApiProperty({ description: 'Descrição detalhada da meta', required: false })
  description?: string;

  @ApiProperty({ 
    description: 'Status da meta',
    enum: ['pendente', 'em_andamento', 'concluida', 'cancelada'],
    default: 'pendente'
  })
  status?: string;

  @ApiProperty({ 
    description: 'Prioridade da meta',
    enum: ['baixa', 'media', 'alta'],
    default: 'media'
  })
  priority?: string;

  @ApiProperty({ 
    description: 'Progresso da meta (0-100)',
    minimum: 0,
    maximum: 100,
    default: 0
  })
  progress?: number;

  @ApiProperty({ 
    description: 'Data de início da meta',
    type: 'string',
    format: 'date-time',
    required: false
  })
  start_date?: Date;

  @ApiProperty({ 
    description: 'Data de conclusão prevista',
    type: 'string',
    format: 'date-time',
    required: false
  })
  due_date?: Date;
}
