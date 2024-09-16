import { CommandContext } from 'grammy';

import { prisma } from '@revelio/prisma/server';

import { BotContext } from '../context';
import { help } from './help';

export async function start(ctx: CommandContext<BotContext>) {
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
}
