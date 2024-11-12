import { Pool } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';
import { Context } from 'hono';

import { getEnv } from '@revelio/env';

export function createPrisma(c: Context) {
  const env = getEnv(c);

  const neon = new Pool({ connectionString: env.POSTGRES_PRISMA_URL });
  const adapter = new PrismaNeon(neon);
  return new PrismaClient({ adapter });
}
