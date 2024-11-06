import { Api } from 'grammy';

import { env } from '@revelio/env/server';

export const api = new Api(env.BOT_TOKEN, {
  apiRoot: env.TELEGRAM_API_URL,
});
