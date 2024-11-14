import * as console from 'node:console';
import { trace } from '@opentelemetry/api';
import { configure } from '@trigger.dev/sdk/v3';
import { Hono } from 'hono';
import { logger } from 'hono/logger';

import { getEnv } from '@revelio/env';
import { createRedisClient } from '@revelio/redis';
import { createCustomer, createStripe, getCustomer } from '@revelio/stripe';

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

app.get('/b/:token', async (c) => {
  const redis = createRedisClient(c);

  const token = c.req.param('token');

  const data = await redis.get<{
    chatId: string;
    chatName: string;
    price: {
      id: string;
      productName: string;
    };
  }>(`bs:${token}`);

  if (!data) {
    return Response.redirect('https://t.me/RevelioGPTBot');
  }

  const { chatId, chatName, price } = data;

  const stripe = createStripe(c);

  const customer = (await getCustomer(c, chatId)) ?? (await createCustomer(c, chatId, chatName));

  const session = await stripe.checkout.sessions.create({
    customer: customer.stripeCustomerId,
    success_url: 'https://t.me/RevelioGPTBot',
    cancel_url: 'https://t.me/RevelioGPTBot',
    mode: 'subscription',
    line_items: [
      {
        price: price.id,
        quantity: 1,
      },
    ],
    allow_promotion_codes: true,
    expand: ['line_items.data.price.product'],
  });

  return Response.redirect(session.url!);
});

app.onError((err, c) => {
  console.error(err);

  trace.getActiveSpan()?.recordException(err);

  return new Response('Ok', { status: 200 });
});
