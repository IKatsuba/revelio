import { Composer } from 'grammy';

import { prisma } from '@revelio/prisma/server';

import { sorry } from '../commands/sorry';
import { BotContext } from '../context';
import { track } from '../middlewares/track';

export const groupComposer = new Composer<BotContext>();

groupComposer.on('msg:new_chat_members:me', track('msg:new_chat_members:me'), async (ctx) => {
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

groupComposer.on('message', track('message:group'), sorry);
