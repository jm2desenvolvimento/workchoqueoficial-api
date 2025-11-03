import { IsString, IsOptional, IsBoolean, IsIn, IsNotEmpty } from 'class-validator';

export const CATEGORY_TYPES = ['content', 'action_plan', 'achievement', 'other'] as const;
export type CategoryType = typeof CATEGORY_TYPES[number];

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsIn(CATEGORY_TYPES)
  type: CategoryType;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @IsOptional()
  order?: number = 0;
}
