import { Api } from 'grammy';

import { envSchema } from '@revelio/env';

const env = envSchema.parse(process.env);

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

    api.getWebhookInfo().then((info) => {
      console.log('Webhook info:', info);
    });
  })
  .catch((error) => {
    console.error('Error setting webhook:', error);
    process.exit(1);
  });
