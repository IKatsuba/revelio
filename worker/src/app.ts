import { configure } from '@trigger.dev/sdk/v3';
import { Hono } from 'hono';

import { getEnv } from '@revelio/env';

import { qstashVerify, remindersAfterNotify } from './webhooks/reminders-after-notify';
import { stripeWebhook } from './webhooks/stripe';
import { tgWebhook, validateWebhook } from './webhooks/tg-webhook';

export const app = new Hono();

app.use(async (c, next) => {
  configure({
    accessToken: getEnv(c).TRIGGER_SECRET_KEY,
  });

  await next();
});

app.post('/api/reminders/after-notify', qstashVerify(), remindersAfterNotify);

app.post('/api/stripe/webhook', stripeWebhook);

app.post('/api/tg/webhook', validateWebhook(), tgWebhook);
