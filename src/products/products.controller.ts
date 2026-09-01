import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductQueryDto } from './dto/product-query.dto.js';
import { ProductsService } from './products.service.js';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  findAll(@Query() query: ProductQueryDto) {
    return this.products.findAll(query);
  }

  // Must stay before the ':slug' route below or it would be swallowed as a slug value.
  @Get('suggestions')
  suggestions(@Query('q') q = '') {
    return this.products.searchSuggestions(q);
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.products.findBySlug(slug);
  }
}
