import { PartialType } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';
import { CreateActionPlanDto } from './create-action-plan.dto';
import { UpdateGoalDto } from './update-goal.dto';

export class UpdateActionPlanDto extends PartialType(CreateActionPlanDto) {
  // Removido a propriedade goals para evitar conflito de tipos
}

export class UpdateActionPlanWithGoalsDto {
  @ApiProperty({ 
    description: 'Metas do Plano de Ação',
    type: [UpdateGoalDto],
    required: false
  })
  goals?: UpdateGoalDto[];
}
