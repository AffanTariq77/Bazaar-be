import { Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

// JwtAuthGuard (via @nestjs/passport's AuthGuard()) needs AuthModuleOptions from
// a registered PassportModule in scope wherever it's used with @UseGuards(). Rather
// than re-importing PassportModule.register() in every feature module that guards
// routes, register it once here as a global module.
@Global()
@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  exports: [PassportModule],
})
export class AuthGuardsModule {}
