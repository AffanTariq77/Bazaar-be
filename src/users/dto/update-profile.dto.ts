import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @Matches(/^\+92\d{10}$/, { message: 'Phone must be in +92XXXXXXXXXX format' })
  phone?: string;
}
