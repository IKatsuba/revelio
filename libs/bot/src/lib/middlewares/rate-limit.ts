import { Algorithm, Ratelimit } from '@upstash/ratelimit';
import { Middleware } from 'grammy';

import { BotContext } from '@revelio/bot-utils';
import { redis } from '@revelio/redis';

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
      redis,
      limiter: limiter[ctx.session.plan ?? 'free'] ?? limiter.free,
      analytics: true,
      prefix: `rate-limit:${name}`,
    });

    const { success, reset } = await rateLimit.limit(ctx.chatId.toString());

    if (!success) {
      const remaining = reset - Date.now();

      await ctx.reply(
        `You are sending messages too fast. Please slow down. Next message can be sent in ${formatSeconds(remaining / 1000)}.`,
      );
    }

    return next();
  };
}

function formatSeconds(seconds: number): string {
  const days = Math.floor(seconds / (24 * 3600));
  seconds %= 24 * 3600;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  seconds %= 60;

  const parts: string[] = [];
  if (days > 0) {
    parts.push(`${days} days`);
  }
  if (hours > 0) {
    parts.push(`${hours} hours`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} minutes`);
  }
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds} seconds`);
  }

  return parts.join(' ');
}
