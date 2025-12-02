import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

const statuses = [
  'pendente',
  'em_andamento',
  'concluida',
  'cancelada',
] as const;
const priorities = ['baixa', 'media', 'alta'] as const;

type GoalStatus = (typeof statuses)[number];
type GoalPriority = (typeof priorities)[number];

export class UpdateGoalDto {
  @ApiPropertyOptional({
    description: 'ID da meta (obrigatório para atualização)',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID(4, { message: 'ID de meta inválido' })
  id?: string;

  @ApiPropertyOptional({
    description: 'Título da meta',
    minLength: 3,
    maxLength: 200,
    example: 'Completar curso avançado de TypeScript',
  })
  @IsOptional()
  @IsString({ message: 'O título deve ser um texto' })
  @Min(3, { message: 'O título deve ter pelo menos 3 caracteres' })
  @Max(200, { message: 'O título não pode ter mais de 200 caracteres' })
  title?: string;

  @ApiPropertyOptional({
    description: 'Descrição detalhada da meta',
    maxLength: 1000,
    example:
      'Completar o curso avançado de TypeScript na plataforma X até o final do mês.',
  })
  @IsOptional()
  @IsString({ message: 'A descrição deve ser um texto' })
  @Max(1000, { message: 'A descrição não pode ter mais de 1000 caracteres' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Status atual da meta',
    enum: statuses,
    example: 'em_andamento',
  })
  @IsOptional()
  @IsIn(statuses, {
    message: `Status inválido. Opções válidas: ${statuses.join(', ')}`,
  })
  status?: GoalStatus;

  @ApiPropertyOptional({
    description: 'Nível de prioridade da meta',
    enum: priorities,
    example: 'alta',
  })
  @IsOptional()
  @IsIn(priorities, {
    message: `Prioridade inválida. Opções válidas: ${priorities.join(', ')}`,
  })
  priority?: GoalPriority;

  @ApiPropertyOptional({
    description: 'Progresso atual da meta (0-100)',
    minimum: 0,
    maximum: 100,
    example: 50,
  })
  @IsOptional()
  @IsNumber({}, { message: 'O progresso deve ser um número' })
  @Min(0, { message: 'O progresso mínimo é 0' })
  @Max(100, { message: 'O progresso máximo é 100' })
  progress?: number;

  @ApiPropertyOptional({
    description: 'Data de início da meta',
    type: 'string',
    format: 'date-time',
    example: '2023-01-15T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data de início inválida' })
  @ValidateIf((o) => o.due_date !== undefined)
  start_date?: Date;

  @ApiPropertyOptional({
    description: 'Data de conclusão prevista',
    type: 'string',
    format: 'date-time',
    example: '2023-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Data de término inválida' })
  @ValidateIf((o) => o.start_date !== undefined, {
    message:
      'A data de início é obrigatória quando a data de término é informada',
  })
  due_date?: Date;

  // Validação personalizada para garantir que a data de término seja posterior à data de início
  validateDates(): boolean {
    if (this.start_date && this.due_date) {
      return new Date(this.due_date) > new Date(this.start_date);
    }
    return true;
  }
}
