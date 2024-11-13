import { MiddlewareHandler } from 'hono';
import { createFactory } from 'hono/factory';

import { initWebhookBot } from '@revelio/bot';
import { getEnv } from '@revelio/env';

const factory = createFactory();

export const tgWebhook = factory.createHandlers(async (c) => {
  const body = await c.req.json();

  try {
    const bot = await initWebhookBot(c);

    console.log('bot.handleUpdate');
    c.executionCtx.waitUntil(bot.handleUpdate(body).catch(console.error));
  } catch (error) {
    console.error('internal error', error);
  }

  return new Response('Ok');
});

export function validateWebhook(): MiddlewareHandler {
  return async (c, next) => {
    console.log('validateWebhook');

    const env = getEnv(c);

    if (!env.BOT_WEBHOOK_SECRET) {
      console.log('No secret token');
      await next();
    } else {
      const token = c.req.header('x-telegram-bot-api-secret-token');
      if (env.BOT_WEBHOOK_SECRET === token) {
        console.log('Valid secret token');
        await next();
      } else {
        console.error('Invalid secret token');
        return new Response('Ok');
      }
    }
  };
}
