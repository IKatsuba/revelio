import { Api } from 'grammy';

import { env } from '@revelio/env';

const api = new Api('7409250764:AAGKHImCzpAGULGfgrs5Yd5sSb4CoInyyzA', {
  apiRoot: env.TELEGRAM_API_URL,
});

api
  .getMe()
  .then((me) => {
    console.log(`Bot:`, me);
  })
  .then(() =>
    api.setWebhook('https://revelio.katsuba.dev/api/tg/webhook', {
      secret_token: 'Ee5rSVSANcvQBQwrSDyGvWa6PVlSS00G' || undefined,
    }),
  )
  .then(() => {
    console.log('Webhook was set successfully');
  })
  .catch((error) => {
    console.error('Error setting webhook:', error);
    process.exit(1);
  });
