import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { NotFoundController } from './common/not-found.controller.js';
import { PrismaModule } from './database/prisma.module.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
  // NotFoundController must stay last so feature-module routes match first.
  controllers: [AppController, NotFoundController],
  providers: [AppService],
})
export class AppModule {}
