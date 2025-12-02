import { IsString, IsOptional, IsBoolean, IsInt, IsIn } from 'class-validator';
import { Prisma } from '@prisma/client';

export class CreateContentDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  type: string;

  @IsString()
  content: string;

  @IsString()
  category_id: string;

  @IsOptional()
  @IsIn(['draft', 'published', 'archived'])
  status?: 'draft' | 'published' | 'archived';

  @IsOptional()
  @IsIn(['public', 'restricted', 'private'])
  access_level?: 'public' | 'restricted' | 'private';

  @IsOptional()
  metadata?: Prisma.InputJsonValue;

  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;

  @IsOptional()
  @IsInt()
  order?: number;
}
