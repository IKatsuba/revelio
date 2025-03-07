import { MiddlewareHandler } from 'hono';

import { injectReceiver } from '@revelio/upstash';

export function qstashVerify(): MiddlewareHandler {
  return async (c, next) => {
    const signature = c.req.header('Upstash-Signature');

    if (!signature) {
      return c.text('Unauthorized', 401);
    }

    const body = await c.req.raw.clone().text();
    const isVerified = await injectReceiver().verify({
      body,
      signature,
    });

    if (!isVerified) {
      return c.text('Unauthorized', 401);
    }

    await next();
  };
}
