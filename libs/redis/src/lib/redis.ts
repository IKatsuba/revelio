import { Redis } from '@upstash/redis/cloudflare';

import { injectEnv } from '@revelio/env';

export function injectRedisClient() {
  const env = injectEnv();

  return new Redis({
    url: env.UPSTASH_REDIS_URL,
    token: env.UPSTASH_REDIS_TOKEN,
  });
}
