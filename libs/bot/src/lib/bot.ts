import { RedisAdapter } from '@grammyjs/storage-redis';
import { Redis } from '@upstash/redis';
import { Bot, Context, enhanceStorage, session } from 'grammy';

import { env } from '@revelio/env/server';

import { groupComposer } from './composers/group';
import { privateComposer } from './composers/private';
import { BotContext, SessionData } from './context';

const sessionRedis = new Redis({
  url: env.BOT_SESSION_REDIS_URL,
  token: env.BOT_SESSION_REDIS_TOKEN,
  automaticDeserialization: false,
});

export const bot = new Bot<BotContext>(env.BOT_TOKEN);

bot.use(
  session({
    storage: enhanceStorage({
      storage: new RedisAdapter({ instance: sessionRedis }),
    }),
    initial: () =>
      ({
        messages: [],
      }) as SessionData,
    getSessionKey: (ctx) => `session:${ctx.chatId?.toString()}`,
  }),
);

bot.filter(Context.has.chatType('private')).use(privateComposer);

bot.filter(Context.has.chatType(['group', 'supergroup'])).use(groupComposer);
