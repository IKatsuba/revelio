import { Middleware } from 'grammy';
import { Context } from 'hono';

import { Analytics } from '@revelio/analytics';
import { BotContext } from '@revelio/bot-utils';
import { getEnv } from '@revelio/env';
import { createLogger } from '@revelio/logger';
import { createOpenAIClient } from '@revelio/openai';
import { createPrisma } from '@revelio/prisma';
import { createRedisClient } from '@revelio/redis';

export function configureBot(c: Context): Middleware<BotContext> {
  return async (ctx, next) => {
    ctx.env = getEnv(c);
    ctx.redis = createRedisClient(c);
    ctx.openai = createOpenAIClient(c);
    ctx.prisma = createPrisma(c);
    ctx.analytics = new Analytics(c.env.analytics, ctx);
    ctx.c = c;
    ctx.logger = createLogger(c, ctx);

    await next();
  };
}
