import { RedisAdapter } from '@grammyjs/storage-redis';
import { Redis } from '@upstash/redis';
import { Bot, Context, enhanceStorage, Middleware, NextFunction, session } from 'grammy';

import { env } from '@revelio/env/server';
import { prisma } from '@revelio/prisma/server';

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

bot.command('start', async (ctx) => {
  if (ctx.from) {
    await prisma.user.upsert({
      where: { id: ctx.from.id },
      update: {},
      create: {
        id: ctx.from.id,
      },
    });

    await prisma.group.upsert({
      where: { id: ctx.chat.id },
      update: {},
      create: {
        id: ctx.chat.id,
        type: ctx.chat.type,
      },
    });

    await prisma.groupMember.upsert({
      where: { userId_groupId: { userId: ctx.from.id, groupId: ctx.chat.id } },
      update: {},
      create: {
        userId: ctx.from.id,
        groupId: ctx.chat.id,
        role: 'OWNER',
      },
    });
  }

  await help(ctx);
});
bot.command('help', help);
bot.command('reset', reset);
bot.command('resend', paywall, resend);
bot.command('image', paywall, image);
bot.command('tts', paywall, tts);

bot.filter(Context.has.chatType('private')).on('message:text', paywall, prompt);
bot
  .filter(() => env.ENABLE_TRANSCRIPTION)
  .on(['message:voice', 'message:audio', 'message:video_note', 'message:video'], paywall, voice);
bot.on(['message:photo', 'message:document'], paywall, describe);

bot.on('msg:new_chat_members:me', async (ctx) => {
  await prisma.group.upsert({
    where: { id: ctx.chat.id },
    update: {},
    create: {
      id: ctx.chat.id,
      type: ctx.chat.type,
    },
  });

  await ctx.reply(
    'Hello! I am Revelio! I am sory, but I am not able to chat in groups. Yet. Stay tuned!',
  );
});

async function paywall(ctx: BotContext, next: NextFunction) {
  await next();
}
