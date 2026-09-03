import { SetMetadata } from '@nestjs/common';

export const THROTTLE_OPTIONS = 'throttle_options';

export interface ThrottleOptions {
  limit: number;
  ttlMs: number;
}

export const Throttle = (options: ThrottleOptions) => SetMetadata(THROTTLE_OPTIONS, options);
