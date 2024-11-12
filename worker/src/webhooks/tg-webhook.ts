import { Context, MiddlewareHandler } from 'hono';

import { initWebhookBot } from '@revelio/bot';
import { getEnv } from '@revelio/env';

export async function tgWebhook(c: Context) {
  const body = await c.req.json();

  try {
    const bot = await initWebhookBot(c);

    await bot.handleUpdate(body);
  } catch (error) {
    console.error('internal error', error);
  }

  return new Response('Ok');
}

export function validateWebhook(): MiddlewareHandler {
  return async (c, next) => {
    const env = getEnv(c);

    if (!env.BOT_WEBHOOK_SECRET) {
      await next();
    } else {
      const token = c.req.header('x-telegram-bot-api-secret-token');
      if (env.BOT_WEBHOOK_SECRET === token) {
        await next();
      } else {
        return new Response('Unauthorized', { status: 401 });
      }
    }
  };
}
