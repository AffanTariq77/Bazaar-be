import { All, Controller, NotFoundException, Req } from '@nestjs/common';
import type { Request } from 'express';

// Lives in NotFoundModule, which must stay the last import in AppModule so
// every feature module's routes are matched first — this only catches what's left.
@Controller()
export class NotFoundController {
  @All('*path')
  handle(@Req() req: Request) {
    throw new NotFoundException(`Cannot ${req.method} ${req.originalUrl}`);
  }
}
