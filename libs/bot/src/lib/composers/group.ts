import { Composer, Context } from 'grammy';

import { BotContext } from '@revelio/bot-utils';
import { prisma } from '@revelio/prisma/server';

import { billing } from '../commands/billing';
import { describe } from '../commands/describe';
import { help } from '../commands/help';
import { image } from '../commands/image';
import { prompt } from '../commands/prompt';
import { resend } from '../commands/resend';
import { reset } from '../commands/reset';
import { tts } from '../commands/tts';
import { usage } from '../commands/usage';
import { voice } from '../commands/voice';
import { paywall } from '../middlewares/paywall';
import { track } from '../middlewares/track';
import { privateComposer } from './private';

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

  await help(ctx);
});

groupComposer.command('help', track('command:help'), help);
groupComposer.command('reset', track('command:reset'), paywall, reset);
groupComposer.command('resend', track('command:resend'), paywall, resend);
groupComposer.command('image', track('command:image'), paywall, image);
groupComposer.command('tts', track('command:tts'), paywall, tts);
groupComposer.command('billing', track('command:billing'), billing);
groupComposer.command('usage', track('command:usage'), paywall, usage);

const mentionFilter = (ctx: Context) =>
  Context.has.text(/revelio/gi)(ctx) || Context.has.text(/ревелио/gi)(ctx);

privateComposer.filter(mentionFilter).on('message:text', track('message:text'), paywall, prompt);
privateComposer
  .filter(mentionFilter)
  .on(
    ['message:voice', 'message:audio', 'message:video_note', 'message:video'],
    track('message:media'),
    paywall,
    voice,
  );
privateComposer
  .filter(mentionFilter)
  .on(['message:photo', 'message:document'], track('message:photo'), paywall, describe);
