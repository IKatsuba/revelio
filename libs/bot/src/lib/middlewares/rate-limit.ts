import { Algorithm, Ratelimit } from '@upstash/ratelimit';
import { Middleware } from 'grammy';

import { BotContext } from '@revelio/bot-utils';
import { injectRedisClient } from '@revelio/redis';
import { formatSeconds } from '@revelio/utils';

export function rateLimit({
  limiter,
  name,
}: {
  limiter: {
    free: Algorithm<any>;
    basic: Algorithm<any>;
    premium: Algorithm<any>;
  };
  name: string;
}): Middleware<BotContext> {
  return async (ctx, next) => {
    if (!ctx.chatId) {
      await next();
      return;
    }

    const rateLimit = new Ratelimit({
      redis: injectRedisClient(),
      limiter: limiter[ctx.session.plan ?? 'free'] ?? limiter.free,
      analytics: true,
      prefix: `rate-limit:${name}`,
    });

    const { success, reset } = await rateLimit.limit(ctx.chatId.toString());

    if (!success) {
      const remaining = reset - Date.now();

      await ctx.reply(
        `You are sending messages too fast. Please slow down. Next message can be sent in ${formatSeconds(Math.floor(remaining / 1000))}.`,
      );

      return;
    }

    return next();
  };
}
