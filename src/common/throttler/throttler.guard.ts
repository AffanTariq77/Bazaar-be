import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { THROTTLE_OPTIONS, type ThrottleOptions } from './throttle.decorator.js';

const DEFAULT_OPTIONS: ThrottleOptions = { limit: 100, ttlMs: 60_000 };

interface Bucket {
  count: number;
  resetAt: number;
}

@Injectable()
export class ThrottlerGuard implements CanActivate {
  // ponytail: in-memory per-instance limiter — resets on cold start and isn't
  // shared across concurrent serverless instances. Fine at this app's scale;
  // move to a shared store (e.g. Redis) if cross-instance abuse becomes real.
  // Replaces @nestjs/throttler, whose compiled require() of @nestjs/common
  // (ESM-only since v12) crashes on boot; no newer throttler release fixes it.
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const { limit, ttlMs } =
      this.reflector.get<ThrottleOptions>(THROTTLE_OPTIONS, context.getHandler()) ?? DEFAULT_OPTIONS;
    const req = context.switchToHttp().getRequest<Request>();
    const key = `${req.ip}:${context.getClass().name}:${context.getHandler().name}`;
    const now = Date.now();

    const bucket = this.buckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + ttlMs });
      return true;
    }

    bucket.count += 1;
    if (bucket.count > limit) {
      throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
