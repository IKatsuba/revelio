import * as console from 'node:console';
import { configure } from '@trigger.dev/sdk/v3';
import { Hono } from 'hono';
import { logger } from 'hono/logger';

import { getEnv } from '@revelio/env';

import { qstashVerify, remindersAfterNotify } from './webhooks/reminders-after-notify';
import { stripeWebhook } from './webhooks/stripe';
import { tgWebhook } from './webhooks/tg-webhook';

export const app = new Hono();

app.use(logger());

app.use(async (c, next) => {
  configure({
    accessToken: getEnv(c).TRIGGER_SECRET_KEY,
  });

  await next();
});

app.post('/api/reminders/after-notify', qstashVerify(), remindersAfterNotify);

app.post('/api/stripe/webhook', stripeWebhook);

app.post('/api/tg/webhook', ...tgWebhook);

app.onError((err, c) => {
  console.error(err);

  return new Response('Ok', { status: 200 });
});
