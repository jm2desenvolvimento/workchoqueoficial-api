import { ApiProperty } from '@nestjs/swagger';

export class Goal {
  @ApiProperty({ description: 'ID da meta' })
  id: string;

  @ApiProperty({ description: 'Título da meta' })
  title: string;

  @ApiProperty({ description: 'Descrição detalhada da meta', required: false })
  description?: string;

  @ApiProperty({ 
    description: 'Status da meta',
    enum: ['pendente', 'em_andamento', 'concluida', 'cancelada']
  })
  status: string;

  @ApiProperty({ 
    description: 'Prioridade da meta',
    enum: ['baixa', 'media', 'alta']
  })
  priority: string;

  @ApiProperty({ 
    description: 'Progresso da meta (0-100)',
    minimum: 0,
    maximum: 100
  })
  progress: number;

  @ApiProperty({ 
    description: 'Data de início da meta',
    type: 'string',
    format: 'date-time'
  })
  start_date?: Date;

  @ApiProperty({ 
    description: 'Data de conclusão prevista',
    type: 'string',
    format: 'date-time'
  })
  due_date?: Date;

  @ApiProperty({ 
    description: 'Data de criação',
    type: 'string',
    format: 'date-time'
  })
  created_at: Date;

  @ApiProperty({ 
    description: 'Data da última atualização',
    type: 'string',
    format: 'date-time'
  })
  updated_at: Date;
}
