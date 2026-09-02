import { DeliveryMethod, PaymentMethod } from '@prisma/client';
import { IsEnum, IsString } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  addressId: string;

  @IsEnum(DeliveryMethod)
  deliveryMethod: DeliveryMethod;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}
