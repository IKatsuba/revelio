import { Api } from 'grammy';

import { env } from '@revelio/env/server';

const api = new Api(env.BOT_TOKEN, {
  apiRoot: env.TELEGRAM_API_URL,
});

api
  .getMe()
  .then((me) => {
    console.log(`Bot:`, me);
  })
  .then(() =>
    api.setWebhook(env.BOT_WEBHOOK_URL, {
      secret_token: env.BOT_WEBHOOK_SECRET || undefined,
    }),
  )
  .then(() => {
    console.log('Webhook was set successfully');
  })
  .catch((error) => {
    console.error('Error setting webhook:', error);
    process.exit(1);
  });
