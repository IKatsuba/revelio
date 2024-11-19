import { Composer } from 'grammy';

import { BotContext } from '@revelio/bot-utils';

export const groupWebhookComposer = new Composer<BotContext>();

groupWebhookComposer.on('pre_checkout_query', async (ctx) => {
  // Create a customer record in the database

  await ctx.answerPreCheckoutQuery(true);
});

groupWebhookComposer.on('message:successful_payment', async (ctx) => {
  await ctx.replyWithChatAction('typing');

  //save the transaction in the database
});
