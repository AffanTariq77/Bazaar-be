import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AddressesModule } from './addresses/addresses.module.js';
import { AdminModule } from './admin/admin.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { CartModule } from './cart/cart.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { AuthGuardsModule } from './common/auth-guards.module.js';
import { NotFoundModule } from './common/not-found.module.js';
import { PrismaModule } from './database/prisma.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { ProductsModule } from './products/products.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { SellersModule } from './sellers/sellers.module.js';
import { UsersModule } from './users/users.module.js';
import { WishlistModule } from './wishlist/wishlist.module.js';

@Module({
  // NotFoundModule's wildcard route must stay the LAST entry here — Nest maps
  // routes in import order, and every future feature module goes before it.
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthGuardsModule,
    UsersModule,
    AuthModule,
    CategoriesModule,
    ProductsModule,
    CartModule,
    WishlistModule,
    AddressesModule,
    OrdersModule,
    ReviewsModule,
    SellersModule,
    AdminModule,
    NotFoundModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
