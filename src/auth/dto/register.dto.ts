import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @Matches(/^\+92\d{10}$/, { message: 'Phone must be in +92XXXXXXXXXX format' })
  phone?: string;

  @IsString()
  @MinLength(8)
  password: string;
}
