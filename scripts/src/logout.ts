import { Api } from 'grammy';

import { env } from '@revelio/env/server';

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
