import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { AuthGuardsModule } from './common/auth-guards.module.js';
import { NotFoundModule } from './common/not-found.module.js';
import { ThrottlerGuard } from './common/throttler/throttler.guard.js';
import { PrismaModule } from './database/prisma.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  // NotFoundModule's wildcard route must stay the LAST entry here — Nest maps
  // routes in import order, and every future feature module goes before it.
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthGuardsModule,
    UsersModule,
    AuthModule,
    NotFoundModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
