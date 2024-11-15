import * as console from 'node:console';
import { trace } from '@opentelemetry/api';
import { configure } from '@trigger.dev/sdk/v3';
import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';

import { getEnv } from '@revelio/env';
import { createLogger } from '@revelio/logger';
import { createRedisClient } from '@revelio/redis';
import { createCustomer, createStripe, getCustomer } from '@revelio/stripe';

import { qstashVerify, remindersAfterNotify } from './webhooks/reminders-after-notify';
import { stripeWebhook } from './webhooks/stripe';
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

app.post('/api/stripe/webhook', logMiddleware, stripeWebhook);

app.post('/api/tg/webhook', ...tgWebhook);

app.get('/b/:token', logMiddleware, async (c) => {
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

app.onError((error, c) => {
  const logger = createLogger(c);

  logger.error('internal error', { error });

  trace.getActiveSpan()?.recordException(error);

  return new Response('Ok', { status: 200 });
});
