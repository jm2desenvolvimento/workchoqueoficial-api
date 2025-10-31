import { IsString, IsOptional, IsBoolean, IsArray, ValidateNested, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateQuestionOptionDto {
  @IsString()
  value: string;

  @IsString()
  label: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  score?: number = 1;

  @IsInt()
  @Min(1)
  order: number;
}

export class CreateQuestionDto {
  @IsString()
  question: string;

  @IsString()
  type: string; // 'scale', 'multiple_choice', 'text', 'yes_no'

  @IsInt()
  @Min(1)
  order: number;

  @IsBoolean()
  @IsOptional()
  required?: boolean = true;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean = true;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionOptionDto)
  @IsOptional()
  options?: CreateQuestionOptionDto[] = [];
}

export class CreateQuestionnaireDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  type: string; // 'stress', 'climate', 'burnout', etc.

  @IsInt()
  @Min(1)
  @IsOptional()
  estimated_time?: number = 15;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean = true;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions: CreateQuestionDto[];
}
