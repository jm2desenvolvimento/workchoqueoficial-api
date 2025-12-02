import { PartialType, OmitType } from '@nestjs/swagger';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateActionPlanDto } from './create-action-plan.dto';
import { UpdateGoalDto } from './update-goal.dto';

export class UpdateActionPlanDto extends PartialType(CreateActionPlanDto) {}

// DTO de atualização que aceita todos os campos do plano + metas
export class UpdateActionPlanWithGoalsDto extends PartialType(
  OmitType(CreateActionPlanDto, ['goals'] as const),
) {
  @ApiProperty({
    description: 'Metas do Plano de Ação',
    type: [UpdateGoalDto],
    required: false,
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateGoalDto)
  goals?: UpdateGoalDto[];
}
