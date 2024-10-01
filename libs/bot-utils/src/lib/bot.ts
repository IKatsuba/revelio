import { Bot } from 'grammy';

import { env } from '@revelio/env/server';

import { BotContext } from './context';

export const bot = new Bot<BotContext>(env.BOT_TOKEN);
