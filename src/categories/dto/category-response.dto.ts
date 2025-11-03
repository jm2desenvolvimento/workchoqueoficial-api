import { CategoryType } from './create-category.dto';

export class CategoryResponseDto {
  id: string;
  name: string;
  description: string | null;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  isActive: boolean;
  parentId: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  children?: CategoryResponseDto[];
}
