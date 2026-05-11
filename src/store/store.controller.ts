import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { StoreService } from './store.service';
import { ProductQueryDto } from './dto/product-query.dto';
import { Public } from '../auth/decorators/public.decorator';

@Public()                         // ← todas las rutas de este controller son públicas
@Controller('store')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  // GET /api/v1/store/products?search=&categoryId=&minPrice=&maxPrice=&onSale=&page=&limit=
  @Get('products')
  getProducts(@Query() query: ProductQueryDto) {
    return this.storeService.getProducts(query);
  }

  // GET /api/v1/store/products/featured   ← OJO: debe ir ANTES de /:id
  @Get('products/featured')
  getFeatured() {
    return this.storeService.getFeatured();
  }

  // GET /api/v1/store/products/new
  @Get('products/new')
  getNewArrivals() {
    return this.storeService.getNewArrivals();
  }

  // GET /api/v1/store/products/on-sale
  @Get('products/on-sale')
  getOnSale() {
    return this.storeService.getOnSale();
  }

  // GET /api/v1/store/products/:id
  @Get('products/:id')
  getProductById(@Param('id', ParseUUIDPipe) id: string) {
    return this.storeService.getProductById(id);
  }

  // GET /api/v1/store/categories
  @Get('categories')
  getCategories() {
    return this.storeService.getCategories();
  }

  // GET /api/v1/store/search?q=labial
  @Get('search')
  quickSearch(@Query('q') q: string) {
    return this.storeService.quickSearch(q);
  }
}
