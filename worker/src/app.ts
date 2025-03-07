import { trace } from '@opentelemetry/api';
import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';

import { provideMessageHistory } from '@revelio/agent';
import { provideAnalytics } from '@revelio/analytics';
import { runInContext, runInContextMiddleware } from '@revelio/di';
import { provideEnv } from '@revelio/env';
import { provideVectorStore } from '@revelio/llm';
import { injectLogger, provideLogger } from '@revelio/logger';
import { provideOpenAI, provideOpenaiProvider } from '@revelio/openai';
import { providePrisma } from '@revelio/prisma';
import { provideReceiver, provideRedisClient, provideWorkflowClient } from '@revelio/upstash';

import { qstashVerify } from './middlewares/qstash-verify';
import { checkPlanHandlers } from './webhooks/check-plan';
import { remindersAfterNotify } from './webhooks/reminders-after-notify';
import { tgWebhook } from './webhooks/tg-webhook';

export const app = new Hono();

app.use(
  runInContextMiddleware(async (c, next) => {
    provideEnv();
    provideAnalytics();
    provideVectorStore();
    provideLogger();
    provideOpenAI();
    provideOpenaiProvider();
    providePrisma();
    provideMessageHistory();
    provideRedisClient();
    provideReceiver();
    provideWorkflowClient();

    await next();
  }),
);

const logMiddleware = createMiddleware(async (c, next) => {
  const logger = injectLogger();

  await next();

  c.executionCtx.waitUntil(logger.flush());
});

app.post('/api/reminders/after-notify', logMiddleware, qstashVerify(), remindersAfterNotify);

app.post('/api/tg/webhook', logMiddleware, ...tgWebhook);

app.post('/api/billing/check-plan', logMiddleware, ...checkPlanHandlers);

app.onError((error, c) => {
  const logger = runInContext(c, () => injectLogger());

  logger.error('internal error', { error });

  trace.getActiveSpan()?.recordException(error);

  return new Response('Ok', { status: 200 });
});
