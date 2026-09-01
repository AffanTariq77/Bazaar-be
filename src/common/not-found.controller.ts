import { All, Controller, NotFoundException, Req } from '@nestjs/common';
import type { Request } from 'express';

// Must stay the last controller registered in AppModule so specific routes
// from feature modules are matched first — this only catches what's left.
@Controller()
export class NotFoundController {
  @All('*path')
  handle(@Req() req: Request) {
    throw new NotFoundException(`Cannot ${req.method} ${req.originalUrl}`);
  }
}
