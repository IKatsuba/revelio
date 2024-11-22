import { trace } from '@opentelemetry/api';
import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';

import {
  classProvider,
  factoryProvider,
  injectHonoContext,
  provide,
  runInContext,
  runInContextMiddleware,
} from '@revelio/di';

import '@revelio/logger';

import { createOpenAI } from '@ai-sdk/openai';
import { D1Database } from '@cloudflare/workers-types';
import { PrismaD1 } from '@prisma/adapter-d1';
import { PrismaClient } from '@prisma/client';
import { Index } from '@upstash/vector/cloudflare';
import OpenAI from 'openai';

import { Analytics } from '@revelio/analytics';
import { ENV_TOKEN, getEnv, injectEnv } from '@revelio/env';
import { injectLogger, WorkerLogger } from '@revelio/logger';
import { OPENAI_API_PROVIDER } from '@revelio/openai';

import { checkPlanHandlers } from './webhooks/check-plan';
import { qstashVerify } from './webhooks/qstash-verify';
import { remindersAfterNotify } from './webhooks/reminders-after-notify';
import { tgWebhook } from './webhooks/tg-webhook';

export const app = new Hono();

app.use(
  runInContextMiddleware(async (c, next) => {
    provide(
      ENV_TOKEN,
      factoryProvider(() => getEnv(injectHonoContext())),
    );

    provide(Analytics, classProvider(Analytics));

    provide(
      Index,
      factoryProvider(() => Index.fromEnv(injectEnv())),
    );

    provide(WorkerLogger, classProvider(WorkerLogger));

    provide(
      OpenAI,
      factoryProvider(() => {
        const env = injectEnv();

        return new OpenAI({
          apiKey: env.OPENAI_API_KEY,
          baseURL: env.OPENAI_API_URL,
        });
      }),
    );

    provide(
      OPENAI_API_PROVIDER,
      factoryProvider(() => {
        const env = injectEnv();

        return createOpenAI({
          baseURL: env.OPENAI_API_URL,
          apiKey: env.OPENAI_API_KEY,
        });
      }),
    );

    provide(
      PrismaClient,
      factoryProvider(() => {
        const env = injectEnv();

        const adapter = new PrismaD1(env.revelioDB as D1Database);

        return new PrismaClient({ adapter });
      }),
    );

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
