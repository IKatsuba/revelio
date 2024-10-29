import { Redis } from '@upstash/redis';

import { env } from '@revelio/env/server';

export const redis = new Redis({
  url: env.BOT_SESSION_REDIS_URL,
  token: env.BOT_SESSION_REDIS_TOKEN,
});
