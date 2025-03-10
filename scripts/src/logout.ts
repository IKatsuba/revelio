import { Api } from 'grammy';

import { envSchema } from '@revelio/env';

const env = envSchema.parse(process.env);

const api = new Api(env.BOT_TOKEN);

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
