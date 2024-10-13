import { CommandContext } from 'grammy';

import { BotContext } from '@revelio/bot-utils';
import { prisma } from '@revelio/prisma/server';

import { help } from './help';

export async function start(ctx: CommandContext<BotContext>) {
  await ctx.replyWithChatAction('typing');

  if (ctx.from) {
    await prisma.user.upsert({
      where: { id: ctx.from.id.toString() },
      update: {
        username: ctx.from.username,
      },
      create: {
        id: ctx.from.id.toString(),
        username: ctx.from.username,
      },
    });

    await prisma.group.upsert({
      where: { id: ctx.chatId.toString() },
      update: {},
      create: {
        id: ctx.chatId.toString(),
        type: ctx.chat.type,
      },
    });

    await prisma.groupMember.upsert({
      where: { userId_groupId: { userId: ctx.from.id.toString(), groupId: ctx.chatId.toString() } },
      update: {},
      create: {
        userId: ctx.from.id.toString(),
        groupId: ctx.chatId.toString(),
        role: 'creator',
      },
    });
  }

  await help(ctx);
}
