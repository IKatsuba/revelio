import { trace } from '@opentelemetry/api';
import { configure } from '@trigger.dev/sdk/v3';
import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';

import { getEnv } from '@revelio/env';
import { createLogger } from '@revelio/logger';

import { qstashVerify, remindersAfterNotify } from './webhooks/reminders-after-notify';
import { tgWebhook } from './webhooks/tg-webhook';

export const app = new Hono();

app.use(async (c, next) => {
  configure({
    accessToken: getEnv(c).TRIGGER_SECRET_KEY,
  });

  await next();
});

const logMiddleware = createMiddleware(async (c, next) => {
  const logger = createLogger(c);

  await next();

  c.executionCtx.waitUntil(logger.flush());
});

app.post('/api/reminders/after-notify', logMiddleware, qstashVerify(), remindersAfterNotify);

app.post('/api/tg/webhook', logMiddleware, ...tgWebhook);

app.onError((error, c) => {
  const logger = createLogger(c);

  logger.error('internal error', { error });

  trace.getActiveSpan()?.recordException(error);

  return new Response('Ok', { status: 200 });
});
