import { Api } from 'grammy';

import { envSchema } from '@revelio/env';

const env = envSchema.parse(process.env);

const api = new Api(env.BOT_TOKEN, {
  apiRoot: env.TELEGRAM_API_URL,
});

Promise.all([api.getMe(), api.getWebhookInfo()])
  .then(([me, info]) => {
    console.log(`Bot:`, me);
    console.log(`Webhook:`, info);
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
