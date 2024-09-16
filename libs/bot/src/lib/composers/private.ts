import { Composer } from 'grammy';

import { prisma } from '@revelio/prisma/server';

import { describe } from '../commands/describe';
import { help } from '../commands/help';
import { image } from '../commands/image';
import { prompt } from '../commands/prompt';
import { resend } from '../commands/resend';
import { reset } from '../commands/reset';
import { tts } from '../commands/tts';
import { voice } from '../commands/voice';
import { BotContext } from '../context';
import { paywall } from '../middlewares/paywall';

export const privateComposer = new Composer<BotContext>();

privateComposer.command('start', async (ctx) => {
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
privateComposer.command('help', help);
privateComposer.command('reset', reset);
privateComposer.command('resend', paywall, resend);
privateComposer.command('image', paywall, image);
privateComposer.command('tts', paywall, tts);

privateComposer.on('message:text', paywall, prompt);
privateComposer.on(
  ['message:voice', 'message:audio', 'message:video_note', 'message:video'],
  paywall,
  voice,
);
privateComposer.on(['message:photo', 'message:document'], paywall, describe);
