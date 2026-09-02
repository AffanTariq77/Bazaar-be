import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  fullName: string;

  @Matches(/^\+92\d{10}$/, { message: 'Phone must be in +92XXXXXXXXXX format' })
  phone: string;

  @IsString()
  line1: string;

  @IsString()
  city: string;

  @IsString()
  province: string;

  @IsString()
  postalCode: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
