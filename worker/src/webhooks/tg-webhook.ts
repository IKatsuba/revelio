import { trace } from '@opentelemetry/api';
import { createFactory } from 'hono/factory';

import { initWebhookBot } from '@revelio/bot';
import { getEnv } from '@revelio/env';
import { createLogger } from '@revelio/logger';

const factory = createFactory();

export const tgWebhook = factory.createHandlers(validateWebhook(), async (c) => {
  const logger = createLogger(c);

  const body = await c.req.json();

  try {
    const bot = await initWebhookBot(c);

    logger.info('bot.handleUpdate');
    c.executionCtx.waitUntil(
      bot
        .handleUpdate(body)
        .catch((error) => {
          console.error(error);
          logger.error('bot.handleUpdate error', { error });

          trace.getActiveSpan()?.recordException(error);
        })
        .then(() => logger.flush()),
    );
  } catch (error) {
    logger.error('internal error', { error });
    trace.getActiveSpan()?.recordException(error as any);
  }

  return new Response('Ok');
});

export function validateWebhook() {
  return factory.createMiddleware(async (c, next) => {
    const logger = createLogger(c);

    logger.info('validateWebhook');

    const env = getEnv(c);

    if (!env.BOT_WEBHOOK_SECRET || env.NODE_ENV === 'development') {
      logger.info('No secret token');
      await next();
    } else {
      console.log(c.req.header());

      const token = c.req.header('x-telegram-bot-api-secret-token');
      if (env.BOT_WEBHOOK_SECRET === token) {
        logger.info('Valid secret token');
        await next();
      } else {
        logger.error('Invalid secret token');
        trace.getActiveSpan()?.recordException('Invalid secret token');
        return new Response('Ok');
      }
    }
  });
}
