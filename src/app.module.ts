import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { NotFoundModule } from './common/not-found.module.js';
import { PrismaModule } from './database/prisma.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  // NotFoundModule's wildcard route must stay the LAST entry here — Nest maps
  // routes in import order, and every future feature module goes before it.
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, UsersModule, AuthModule, NotFoundModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
