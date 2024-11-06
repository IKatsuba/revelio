import { Api } from 'grammy';

const token = process.env.BOT_TOKEN;

if (!token) {
  throw new Error('BOT_TOKEN and BOT_WEBHOOK_URL must be set');
}

const api = new Api(token);

api
  .getMe()
  .then((me) => {
    console.log(`Bot:`, me);
  })
  .then(() => api.logOut())
  .then((res) => {
    console.log('Bot logged out successfully');
  })
  .catch((error) => {
    console.error('Error logging out:', error);
    process.exit(1);
  });
