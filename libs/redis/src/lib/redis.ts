import { Redis } from '@upstash/redis/cloudflare';
import { Context } from 'hono';

import { getEnv } from '@revelio/env';

export function createRedisClient(c: Context) {
  const env = getEnv(c);

  return new Redis({
    url: env.UPSTASH_REDIS_URL,
    token: env.UPSTASH_REDIS_TOKEN,
  });
}
