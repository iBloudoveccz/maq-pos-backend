import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  name: string;

  @IsOptional()
  @IsInt()
  parentId?: number | null;
}
