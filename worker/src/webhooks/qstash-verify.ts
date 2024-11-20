import { Receiver } from '@upstash/qstash';
import { Context, MiddlewareHandler } from 'hono';

import { getEnv } from '@revelio/env';

export function qstashVerify(): MiddlewareHandler {
  return async (c, next) => {
    const signature = c.req.header('Upstash-Signature');

    if (!signature) {
      return c.text('Unauthorized', 401);
    }

    const body = await c.req.raw.clone().text();
    const isVerified = await createReceiver(c).verify({
      body,
      signature,
    });

    if (!isVerified) {
      return c.text('Unauthorized', 401);
    }

    await next();
  };
}

function createReceiver(c: Context) {
  const env = getEnv(c);

  return new Receiver({
    currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY,
  });
}
