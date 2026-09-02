import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateSellerProductDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  discount?: number;

  @IsString()
  sku: string;

  @IsString()
  brand: string;

  @IsOptional()
  @IsBoolean()
  freeShipping?: boolean;

  @IsString()
  categoryId: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockQuantity: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
