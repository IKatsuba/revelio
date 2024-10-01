import { tasks } from '@trigger.dev/sdk/v3';

import { BotContext } from '@revelio/bot-utils';
import { ImageTask } from '@revelio/jobs';

export async function image(ctx: BotContext) {
  const prompt = ctx.message?.text?.replace(/^\/image/, '').trim();

  if (!prompt) {
    await ctx.reply('Please provide a prompt for the image generation');
    return;
  }

  if (!ctx.chatId) {
    await ctx.reply('Please provide a chatId');
    return;
  }

  await ctx.replyWithChatAction('upload_photo');

  await tasks.trigger<ImageTask>('image', {
    prompt,
    chatId: ctx.chatId,
  });
}
