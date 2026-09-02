import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNumber, IsString, Max, Min } from 'class-validator';

export class CreateCouponDto {
  @IsString()
  code: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  discountPercent: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minOrderAmount: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxDiscount: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  usageLimit: number;

  @IsDateString()
  expiresAt: string;
}
