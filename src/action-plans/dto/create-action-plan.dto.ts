import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateGoalDto } from './create-goal.dto';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const categories = [
  'leadership',
  'wellness',
  'development',
  'performance',
  'career',
] as const;
const statuses = [
  'rascunho',
  'em_andamento',
  'pausado',
  'concluido',
  'cancelado',
] as const;
const priorities = ['baixa', 'media', 'alta'] as const;

type ActionPlanCategory = (typeof categories)[number];
type ActionPlanStatus = (typeof statuses)[number];
type ActionPlanPriority = (typeof priorities)[number];

export class CreateActionPlanDto {
  @ApiProperty({
    description: 'Título do Plano de Ação',
    example: 'Plano de Desenvolvimento Profissional',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'O título é obrigatório' })
  @IsString({ message: 'O título deve ser um texto' })
  title: string;

  @ApiPropertyOptional({
    description: 'Descrição detalhada do plano',
    example:
      'Plano para desenvolvimento de habilidades técnicas e comportamentais',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: 'A descrição deve ser um texto' })
  @Max(1000, { message: 'A descrição não pode ter mais de 1000 caracteres' })
  description?: string;

  @ApiProperty({
    description: 'Categoria do plano',
    enum: categories,
    example: 'development',
  })
  @IsIn(categories, {
    message: `Categoria inválida. Opções válidas: ${categories.join(', ')}`,
  })
  category: ActionPlanCategory;

  @ApiPropertyOptional({
    description: 'Status atual do plano',
    enum: statuses,
    default: 'rascunho',
  })
  @IsOptional()
  @IsIn(statuses, {
    message: `Status inválido. Opções válidas: ${statuses.join(', ')}`,
  })
  status?: ActionPlanStatus = 'rascunho';

  @ApiPropertyOptional({
    description: 'Nível de prioridade do plano',
    enum: priorities,
    default: 'media',
  })
  @IsOptional()
  @IsIn(priorities, {
    message: `Prioridade inválida. Opções válidas: ${priorities.join(', ')}`,
  })
  priority?: ActionPlanPriority = 'media';

  @ApiPropertyOptional({
    description: 'Progresso atual do plano (0-100)',
    minimum: 0,
    maximum: 100,
    default: 0,
    example: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'O progresso deve ser um número' })
  @Min(0, { message: 'O progresso mínimo é 0' })
  @Max(100, { message: 'O progresso máximo é 100' })
  progress?: number = 0;

  @ApiPropertyOptional({
    description: 'Data de início planejada',
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

  @ApiPropertyOptional({
    description: 'ID do diagnóstico relacionado (opcional)',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID(4, { message: 'ID de diagnóstico inválido' })
  diagnostic_id?: string;

  @ApiPropertyOptional({
    description: 'Lista de metas associadas ao plano',
    type: [CreateGoalDto],
    example: [
      {
        title: 'Curso de TypeScript',
        description: 'Completar curso avançado de TypeScript',
        status: 'pendente',
        priority: 'alta',
        progress: 0,
      },
    ],
  })
  @IsOptional()
  @IsArray({ message: 'As metas devem ser fornecidas como um array' })
  @ValidateNested({ each: true })
  @Type(() => CreateGoalDto)
  goals?: CreateGoalDto[];

  // Validação personalizada para garantir que a data de término seja posterior à data de início
  validateDates(): boolean {
    if (this.start_date && this.due_date) {
      return new Date(this.due_date) > new Date(this.start_date);
    }
    return true;
  }
}
