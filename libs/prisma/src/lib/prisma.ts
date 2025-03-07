import { D1Database } from '@cloudflare/workers-types';
import { PrismaD1 } from '@prisma/adapter-d1';
import { PrismaClient } from '@prisma/client';

import { factoryProvider, inject, provide } from '@revelio/di';
import { injectEnv } from '@revelio/env';

export function injectPrisma() {
  return inject(PrismaClient);
}

export function providePrisma() {
  provide(
    PrismaClient,
    factoryProvider(() => {
      const env = injectEnv();

      const adapter = new PrismaD1(env.revelioDB as D1Database);

      return new PrismaClient({ adapter });
    }),
  );
}
