import { Redis } from '@upstash/redis/cloudflare';

import { factoryProvider, inject, provide } from '@revelio/di';
import { injectEnv } from '@revelio/env';

export function injectRedisClient() {
  return inject(Redis);
}

function createRedisClient() {
  const env = injectEnv();

  return new Redis({
    url: env.UPSTASH_REDIS_URL,
    token: env.UPSTASH_REDIS_TOKEN,
  });
}

export function provideRedisClient() {
  provide(Redis, factoryProvider(createRedisClient));
}
