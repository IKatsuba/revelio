import { RedisAdapter } from '@grammyjs/storage-redis';
import { Redis } from '@upstash/redis';
import { Bot, Context, enhanceStorage, session } from 'grammy';

import { env } from '@revelio/env/server';

import { describe } from './commands/describe';
import { help } from './commands/help';
import { image } from './commands/image';
import { prompt } from './commands/prompt';
import { resend } from './commands/resend';
import { reset } from './commands/reset';
import { tts } from './commands/tts';
import { voice } from './commands/voice';
import { BotContext, SessionData } from './context';

const sessionRedis = new Redis({
  url: env.BOT_SESSION_REDIS_URL,
  token: env.BOT_SESSION_REDIS_TOKEN,
  automaticDeserialization: false,
});

export const bot = new Bot<BotContext>(env.BOT_TOKEN!);

bot.use(
  session({
    storage: enhanceStorage({
      storage: new RedisAdapter({ instance: sessionRedis }),
    }),
    initial: () =>
      ({
        messages: [],
        usage: {
          total: {
            promptTokens: 0,
            completionTokens: 0,
          },
        },
      }) as SessionData,
    getSessionKey: (ctx) => `session:${ctx.chatId?.toString()}`,
  }),
);

bot.command('start', help);
bot.command('help', help);
bot.command('reset', reset);
bot.command('resend', resend);
bot.filter(() => env.ENABLE_IMAGE_GENERATION).command('image', image);
bot.filter(() => env.ENABLE_TTS_GENERATION).command('tts', tts);
bot.filter((ctx) => onlyPrivateChatAndTextMessage(ctx) || onlyGroupChatAndCommandChat(ctx), prompt);
bot
  .filter(() => env.ENABLE_TRANSCRIPTION)
  .on(['message:voice', 'message:audio', 'message:video_note', 'message:video'], voice);
bot.filter(() => env.ENABLE_VISION).on(['message:photo', 'message:document'], describe);

function onlyPrivateChatAndTextMessage(ctx: BotContext) {
  return Context.has.chatType('private')(ctx) && Context.has.filterQuery('message:text')(ctx);
}

function onlyGroupChatAndCommandChat(ctx: BotContext) {
  return Context.has.chatType(['group', 'supergroup'])(ctx) && Context.has.command('chat')(ctx);
}
