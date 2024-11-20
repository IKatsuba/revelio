import { D1Database } from '@cloudflare/workers-types';
import { PrismaD1 } from '@prisma/adapter-d1';
import { PrismaClient } from '@prisma/client';
import { Context } from 'hono';

export function createPrisma(c: Context) {
  const adapter = new PrismaD1(c.env.revelioDB as D1Database);
  return new PrismaClient({ adapter });
}
