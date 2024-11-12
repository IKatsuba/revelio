import { Api } from 'grammy';
import { Context } from 'hono';

import { getEnv } from '@revelio/env';

export function createBotApi(c: Context) {
  const env = getEnv(c);

  return new Api(env.BOT_TOKEN, {
    apiRoot: env.TELEGRAM_API_URL,
  });
}
