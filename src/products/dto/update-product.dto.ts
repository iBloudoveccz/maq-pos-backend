import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

// Todos los campos de CreateProductDto se vuelven opcionales
export class UpdateProductDto extends PartialType(CreateProductDto) {}
