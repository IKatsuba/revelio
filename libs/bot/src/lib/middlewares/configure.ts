import { Middleware } from 'grammy';
import { Context } from 'hono';

import { Analytics } from '@revelio/analytics';
import { BotContext } from '@revelio/bot-utils';
import { getEnv } from '@revelio/env';
import { createOpenAIClient } from '@revelio/openai';
import { createSQLClient } from '@revelio/prisma';
import { createRedisClient } from '@revelio/redis';
import { createStripe } from '@revelio/stripe';

export function configureBot(c: Context): Middleware<BotContext> {
  return async (ctx, next) => {
    ctx.env = getEnv(c);
    ctx.stripe = createStripe(c);
    ctx.redis = createRedisClient(c);
    ctx.openai = createOpenAIClient(c);
    ctx.sql = createSQLClient(c);
    ctx.analytics = new Analytics(c.env.analytics, ctx);

    await next();
  };
}
