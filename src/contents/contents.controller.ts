import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ContentsService } from './contents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Conteúdos')
@ApiBearerAuth('JWT')
@Controller('contents')
@UseGuards(JwtAuthGuard)
export class ContentsController {
  constructor(private contentsService: ContentsService) {}

  @Get()
  async findAll(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('orderBy') orderBy?: 'created_at' | 'updated_at' | 'title' | 'order',
    @Query('order') order?: 'asc' | 'desc',
  ) {
    const role = req.user?.role;
    if (role === 'user') {
      throw new ForbiddenException('Acesso restrito a administradores');
    }
    return this.contentsService.findAll({
      search,
      type,
      categoryId,
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      orderBy,
      order,
    });
  }

  @Get('suggested')
  async findSuggested(@Req() req: any) {
    const userId = req.user?.id ?? req.user?.sub;
    return this.contentsService.findSuggestedByUser(userId);
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const role = req.user?.role;
    const item = await this.contentsService.findOne(id);
    if (role === 'user' && item.status !== 'published') {
      throw new ForbiddenException('Conteúdo não disponível');
    }
    return item;
  }

  @Post()
  async create(@Req() req: any, @Body() data: CreateContentDto) {
    const role = req.user?.role;
    if (role !== 'admin' && role !== 'master') {
      throw new ForbiddenException(
        'Apenas administradores podem criar conteúdos',
      );
    }
    const userId = req.user?.id ?? req.user?.sub;
    return this.contentsService.create(data, userId);
  }

  @Put(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: UpdateContentDto,
  ) {
    const role = req.user?.role;
    if (role !== 'admin' && role !== 'master') {
      throw new ForbiddenException(
        'Apenas administradores podem editar conteúdos',
      );
    }
    return this.contentsService.update(id, data);
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    const role = req.user?.role;
    if (role !== 'admin' && role !== 'master') {
      throw new ForbiddenException(
        'Apenas administradores podem excluir conteúdos',
      );
    }
    return this.contentsService.remove(id);
  }
}
