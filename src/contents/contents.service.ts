import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';

@Injectable()
export class ContentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    search?: string;
    type?: string;
    categoryId?: string;
    status?: string;
    page?: number;
    limit?: number;
    orderBy?: 'created_at' | 'updated_at' | 'title' | 'order';
    order?: 'asc' | 'desc';
  }) {
    const {
      search,
      type,
      categoryId,
      status,
      page = 1,
      limit = 20,
      orderBy = 'created_at',
      order = 'desc',
    } = params;

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (type) where.type = type;
    if (categoryId) where.category_id = categoryId;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.content.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
        orderBy: { [orderBy]: order },
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.prisma.content.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const item = await this.prisma.content.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
      },
    });
    if (!item) throw new NotFoundException('Conteúdo não encontrado');
    return item;
  }

  async create(data: CreateContentDto, userId: string) {
    const created = await this.prisma.content.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        content: data.content,
        category_id: data.category_id,
        status: data.status ?? 'draft',
        access_level: data.access_level ?? 'restricted',
        metadata: data.metadata as Prisma.InputJsonValue,
        is_featured: data.is_featured ?? false,
        order: data.order ?? 0,
        created_by: userId,
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });
    return created;
  }

  async update(id: string, data: UpdateContentDto) {
    const exists = await this.prisma.content.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Conteúdo não encontrado');
    const updated = await this.prisma.content.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        content: data.content,
        category_id: data.category_id,
        status: data.status,
        access_level: data.access_level,
        metadata: data.metadata as Prisma.InputJsonValue,
        is_featured: data.is_featured,
        order: data.order,
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });
    return updated;
  }

  async remove(id: string) {
    const exists = await this.prisma.content.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Conteúdo não encontrado');
    await this.prisma.content.delete({ where: { id } });
    return { id };
  }

  async findSuggestedByUser(userId: string) {
    const apc = await this.prisma.action_plan_content.findMany({
      where: {
        action_plan: {
          user_id: userId,
        },
      },
      include: {
        content: {
          include: {
            category: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ order: 'asc' }, { created_at: 'desc' }],
    });

    const map = new Map<string, any>();
    for (const item of apc) {
      if (!item.content) continue;
      if (item.content.status !== 'published') continue;
      map.set(item.content_id, item.content);
    }
    return Array.from(map.values());
  }
}
