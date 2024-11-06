import { PrismaClient } from '@prisma/client';

import { env } from '@revelio/env/server';

declare const globalThis: {
  prismaGlobal: PrismaClient;
} & typeof global;

export const prisma = globalThis.prismaGlobal ?? new PrismaClient();

if (env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}
