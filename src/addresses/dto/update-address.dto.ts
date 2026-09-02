import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateAddressDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @Matches(/^\+92\d{10}$/, { message: 'Phone must be in +92XXXXXXXXXX format' })
  phone?: string;

  @IsOptional()
  @IsString()
  line1?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
