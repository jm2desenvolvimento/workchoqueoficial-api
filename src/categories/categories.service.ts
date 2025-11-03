import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { category_type } from '@prisma/client';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto, userId: string) {
    return this.prisma.category.create({
      data: {
        ...createCategoryDto,
        created_by: userId,
      },
    });
  }

  async findAll(type?: category_type) {
    const where = type ? { type } : undefined;
    return this.prisma.category.findMany({
      where,
      orderBy: { order: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Categoria com ID ${id} não encontrada`);
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    await this.findOne(id); // Verifica se a categoria existe
    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Verifica se a categoria existe
    return this.prisma.category.delete({
      where: { id },
    });
  }

  async findHierarchy(type: category_type) {
    const categories = await this.prisma.category.findMany({
      where: { type },
      orderBy: { order: 'asc' },
    });

    const buildTree = (parentId: string | null = null) => {
      return categories
        .filter(category => category.parent_id === parentId)
        .map(category => ({
          ...category,
          children: buildTree(category.id),
        }));
    };

    return buildTree();
  }
}
