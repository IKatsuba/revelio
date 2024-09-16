import { RedisAdapter } from '@grammyjs/storage-redis';
import { Redis } from '@upstash/redis';
import { Bot, Context, enhanceStorage, NextFunction, session } from 'grammy';

import { env } from '@revelio/env/server';
import { prisma } from '@revelio/prisma/server';

import { describe } from './commands/describe';
import { help } from './commands/help';
import { image } from './commands/image';
import { prompt } from './commands/prompt';
import { resend } from './commands/resend';
import { reset } from './commands/reset';
import { sorry } from './commands/sorry';
import { tts } from './commands/tts';
import { voice } from './commands/voice';
import { BotContext, SessionData } from './context';
import { paywall } from './middlewares/paywall';

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

const privateCommands = bot.filter(Context.has.chatType('private'));

privateCommands.command('start', async (ctx) => {
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
        role: 'creator',
      },
    });
  }

  await help(ctx);
});
privateCommands.command('help', help);
privateCommands.command('reset', reset);
privateCommands.command('resend', paywall, resend);
privateCommands.command('image', paywall, image);
privateCommands.command('tts', paywall, tts);

privateCommands.on('message:text', paywall, prompt);
privateCommands.on(
  ['message:voice', 'message:audio', 'message:video_note', 'message:video'],
  paywall,
  voice,
);
privateCommands.on(['message:photo', 'message:document'], paywall, describe);

const groupCommands = bot.filter(Context.has.chatType(['group', 'supergroup']));

groupCommands.on('msg:new_chat_members:me', async (ctx) => {
  await prisma.group.upsert({
    where: { id: ctx.chat.id },
    update: {},
    create: {
      id: ctx.chat.id,
      type: ctx.chat.type,
    },
  });

  const admins = await ctx.getChatAdministrators();

  for (const admin of admins) {
    await prisma.groupMember.upsert({
      where: { userId_groupId: { userId: admin.user.id, groupId: ctx.chat.id } },
      update: {},
      create: {
        userId: admin.user.id,
        groupId: ctx.chat.id,
        role: admin.status,
      },
    });
  }

  await sorry(ctx);
});

groupCommands.on('message', sorry);
