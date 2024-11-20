import { Ratelimit } from '@upstash/ratelimit';
import { Composer, Context } from 'grammy';

import { BotContext } from '@revelio/bot-utils';

import {
  billing,
  callbackQuerySubscriptionCancel,
  callbackQuerySubscriptionFree,
} from '../commands/billing';
import { help } from '../commands/help';
import { prompt } from '../commands/prompt';
import { reset } from '../commands/reset';
import { paywall } from '../middlewares/paywall';
import { rateLimit } from '../middlewares/rate-limit';
import { track } from '../middlewares/track';

export const groupWebhookComposer = new Composer<BotContext>();

groupWebhookComposer.on(
  'msg:new_chat_members:me',
  track('msg:new_chat_members:me'),
  async (ctx) => {
    ctx.logger.info('Bot added to the new chat', { chatId: ctx.chat.id });

    await ctx.prisma.group.upsert({
      where: { id: ctx.chat.id.toString() },
      create: {
        id: ctx.chat.id.toString(),
        type: ctx.chat.type,
        plan: 'free',
      },
      update: {
        type: ctx.chat.type,
      },
    });

    const admins = await ctx.getChatAdministrators();

    for (const admin of admins) {
      await ctx.prisma.groupMember.upsert({
        where: {
          userId_groupId: { userId: admin.user.id.toString(), groupId: ctx.chat.id.toString() },
        },
        create: {
          userId: admin.user.id.toString(),
          groupId: ctx.chat.id.toString(),
          role: admin.status,
        },
        update: {
          role: admin.status,
        },
      });
    }

    await help(ctx);
  },
);

groupWebhookComposer.command('help', track('command:help'), help);
groupWebhookComposer.command('reset', track('command:reset'), paywall, reset);
groupWebhookComposer.command('billing', track('command:billing'), billing);
groupWebhookComposer.callbackQuery(
  'subscription:free',
  track('callbackQuery:subscription:free'),
  callbackQuerySubscriptionFree,
);
groupWebhookComposer.callbackQuery(
  'subscription:cancel',
  track('callbackQuery:subscription:cancel'),
  callbackQuerySubscriptionCancel,
);

const mentionFilter = (ctx: Context) =>
  Context.has.text(/revelio/gi)(ctx) ||
  Context.has.text(/ревелио/gi)(ctx) ||
  Context.has.text(/сан/gi)(ctx);

groupWebhookComposer.filter(mentionFilter).on(
  ['message:text', 'message:photo', 'message:document'],
  track('message:text'),
  paywall,
  rateLimit({
    limiter: {
      free: Ratelimit.fixedWindow(10, '1d'),
      basic: Ratelimit.fixedWindow(100, '1d'),
      premium: Ratelimit.fixedWindow(500, '1d'),
    },
    name: 'text',
  }),
  prompt,
);
