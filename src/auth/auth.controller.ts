import { Body, Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { Throttle } from '../common/throttler/throttle.decorator.js';
import { UsersService } from '../users/users.service.js';
import { AuthService, type AuthResult } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

const REFRESH_COOKIE = 'refreshToken';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  @Throttle({ limit: 5, ttlMs: 60_000 })
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    return this.respondWithTokens(await this.auth.register(dto), res);
  }

  @Throttle({ limit: 5, ttlMs: 60_000 })
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.respondWithTokens(await this.auth.login(dto), res);
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw new UnauthorizedException('Missing refresh token');
    return this.respondWithTokens(await this.auth.refresh(token), res);
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
    return { loggedOut: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() authUser: AuthUser) {
    const user = await this.users.findById(authUser.id);
    if (!user) throw new UnauthorizedException();
    return this.users.toSafeUser(user);
  }

  private respondWithTokens({ accessToken, refreshToken, user }: AuthResult, res: Response) {
    res.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      // Deliberately not tied to NODE_ENV: this app can run "production" behind
      // plain HTTP (e.g. the local docker-compose demo), where a Secure cookie
      // would silently never be sent back by the browser and break refresh.
      // Set COOKIE_SECURE=true only once the deployment is actually served over HTTPS.
      secure: process.env.COOKIE_SECURE === 'true',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });
    return { accessToken, user };
  }
}
