import { Composer, Context } from 'grammy';

import { BotContext } from '@revelio/bot-utils';
import { prisma } from '@revelio/prisma/server';

import { billing } from '../commands/billing';
import { describe } from '../commands/describe';
import { help } from '../commands/help';
import { prompt } from '../commands/prompt';
import { reset } from '../commands/reset';
import { tts } from '../commands/tts';
import { usage } from '../commands/usage';
import { voice } from '../commands/voice';
import { paywall } from '../middlewares/paywall';
import { track } from '../middlewares/track';

export const groupWebhookComposer = new Composer<BotContext>();

groupWebhookComposer.on(
  'msg:new_chat_members:me',
  track('msg:new_chat_members:me'),
  async (ctx) => {
    console.log('New chat members');
    await prisma.group.upsert({
      where: { id: ctx.chat.id.toString() },
      update: {},
      create: {
        id: ctx.chat.id.toString(),
        type: ctx.chat.type,
      },
    });

    const admins = await ctx.getChatAdministrators();

    for (const admin of admins) {
      await prisma.groupMember.upsert({
        where: {
          userId_groupId: { userId: admin.user.id.toString(), groupId: ctx.chat.id.toString() },
        },
        update: {},
        create: {
          userId: admin.user.id.toString(),
          groupId: ctx.chat.id.toString(),
          role: admin.status,
        },
      });
    }

    await help(ctx);
  },
);

groupWebhookComposer.command('help', track('command:help'), help);
groupWebhookComposer.command('reset', track('command:reset'), paywall, reset);
groupWebhookComposer.command('tts', track('command:tts'), paywall, tts);
groupWebhookComposer.command('billing', track('command:billing'), billing);
groupWebhookComposer.callbackQuery('subscription:free', track('callbackQuery:billing'), billing);
groupWebhookComposer.command('usage', track('command:usage'), paywall, usage);

const mentionFilter = (ctx: Context) =>
  Context.has.text(/revelio/gi)(ctx) ||
  Context.has.text(/ревелио/gi)(ctx) ||
  Context.has.text(/сан/gi)(ctx);

groupWebhookComposer
  .filter(mentionFilter)
  .on('message:text', track('message:text'), paywall, prompt);
groupWebhookComposer
  .filter(mentionFilter)
  .on(
    ['message:voice', 'message:audio', 'message:video_note', 'message:video'],
    track('message:media'),
    paywall,
    voice,
  );
groupWebhookComposer
  .filter(mentionFilter)
  .on(['message:photo', 'message:document'], track('message:photo'), paywall, describe);
