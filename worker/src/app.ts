import { trace } from '@opentelemetry/api';
import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';

import { provideHonoContext } from '@revelio/di';

import '@revelio/logger';

import { injectLogger } from '@revelio/logger';

import { checkPlanHandlers } from './webhooks/check-plan';
import { qstashVerify } from './webhooks/qstash-verify';
import { remindersAfterNotify } from './webhooks/reminders-after-notify';
import { tgWebhook } from './webhooks/tg-webhook';

export const app = new Hono();

app.use(async (c, next) => {
  provideHonoContext(c);

  await next();
});

const logMiddleware = createMiddleware(async (c, next) => {
  const logger = injectLogger();

  await next();

  c.executionCtx.waitUntil(logger.flush());
});

app.post('/api/reminders/after-notify', logMiddleware, qstashVerify(), remindersAfterNotify);

app.post('/api/tg/webhook', logMiddleware, ...tgWebhook);

app.post('/api/billing/check-plan', logMiddleware, ...checkPlanHandlers);

app.onError((error) => {
  const logger = injectLogger();

  logger.error('internal error', { error });

  trace.getActiveSpan()?.recordException(error);

  return new Response('Ok', { status: 200 });
});
