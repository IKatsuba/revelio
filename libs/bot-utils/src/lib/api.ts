import { Api } from 'grammy';

import { env } from '@revelio/env/server';

export const api = new Api(env.BOT_TOKEN);
