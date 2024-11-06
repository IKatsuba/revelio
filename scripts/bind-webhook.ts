import { Api } from 'grammy';

const token = process.env.BOT_TOKEN;
const webhookUrl = process.env.BOT_WEBHOOK_URL;
const secret = process.env.BOT_WEBHOOK_SECRET;

if (!token || !webhookUrl) {
  throw new Error('BOT_TOKEN and BOT_WEBHOOK_URL must be set');
}

const api = new Api(token, {
  apiRoot: process.env.TELEGRAM_API_URL,
});

api
  .getMe()
  .then((me) => {
    console.log(`Bot:`, me);
  })
  .then(() =>
    api.setWebhook(webhookUrl, {
      secret_token: secret || undefined,
    }),
  )
  .then(() => {
    console.log('Webhook was set successfully');
  })
  .catch((error) => {
    console.error('Error setting webhook:', error);
    process.exit(1);
  });
