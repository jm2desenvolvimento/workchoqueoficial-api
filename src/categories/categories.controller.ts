import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
  UseGuards,
  Request,
  ParseEnumPipe,
  BadRequestException,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { category_type } from '@prisma/client';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

// Validador personalizado para o tipo de categoria
class CategoryTypeValidationPipe extends ParseEnumPipe<typeof category_type> {
  constructor() {
    super(category_type, {
      exceptionFactory: () =>
        new BadRequestException(
          `Tipo de categoria inválido. Use: ${Object.values(category_type).join(', ')}`,
        ),
    });
  }
}

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  create(@Body() createCategoryDto: CreateCategoryDto, @Request() req: any) {
    const userId = req.user?.id || 'system';
    return this.categoriesService.create(createCategoryDto, userId);
  }

  @Get()
  findAll(
    @Query('type', new CategoryTypeValidationPipe())
    type?: category_type,
  ) {
    return type
      ? this.categoriesService.findHierarchy(type)
      : this.categoriesService.findAll();
  }

  @Get('hierarchy')
  findHierarchy(
    @Query('type', new CategoryTypeValidationPipe())
    type: category_type,
  ) {
    return this.categoriesService.findHierarchy(type);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
