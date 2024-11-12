import { Middleware } from 'grammy';
import { Context } from 'hono';

import { BotContext } from '@revelio/bot-utils';
import { getEnv } from '@revelio/env';
import { createOpenAIClient } from '@revelio/openai';
import { createPrisma } from '@revelio/prisma';
import { createRedisClient } from '@revelio/redis';
import { createStripe } from '@revelio/stripe';

export function configureBot(c: Context): Middleware<BotContext> {
  return async (ctx, next) => {
    ctx.env = getEnv(c);
    ctx.prisma = createPrisma(c);
    ctx.stripe = createStripe(c);
    ctx.redis = createRedisClient(c);
    ctx.openai = createOpenAIClient(c);

    await next();
  };
}
