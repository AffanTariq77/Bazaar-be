import { Body, Controller, Get, Patch, UnauthorizedException, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UsersService } from './users.service.js';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  async me(@CurrentUser() authUser: AuthUser) {
    const user = await this.users.findById(authUser.id);
    if (!user) throw new UnauthorizedException();
    return this.users.toSafeUser(user);
  }

  @Patch('me')
  async updateMe(@CurrentUser() authUser: AuthUser, @Body() dto: UpdateProfileDto) {
    const updated = await this.users.updateProfile(authUser.id, dto);
    return this.users.toSafeUser(updated);
  }
}
