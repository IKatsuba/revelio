import { PrismaClient } from '@prisma/client';

import { inject } from '@revelio/di';

export function injectPrisma() {
  return inject(PrismaClient);
}
