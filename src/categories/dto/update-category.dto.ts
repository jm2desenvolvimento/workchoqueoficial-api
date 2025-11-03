import { PartialType } from '@nestjs/mapped-types';
import { CreateCategoryDto, CategoryType, CATEGORY_TYPES } from './create-category.dto';
import { IsIn, IsOptional } from 'class-validator';

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  @IsIn(CATEGORY_TYPES)
  @IsOptional()
  type?: CategoryType;
}
