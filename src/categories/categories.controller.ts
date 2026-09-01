import { Controller, Get, Param } from '@nestjs/common';
import { CategoriesService } from './categories.service.js';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  findAll() {
    return this.categories.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categories.findById(id);
  }
}
