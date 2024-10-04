import { tasks } from '@trigger.dev/sdk/v3';

import { BotContext } from '@revelio/bot-utils';
import { ImageTask } from '@revelio/jobs';

export async function prompt(ctx: BotContext) {
  console.log(`New message received from user ${ctx.from?.username} (id: ${ctx.from?.id})`);

  await ctx.replyWithChatAction('typing');

  const prompt = ctx.message?.text?.replace(/^\/chat/, '').trim();

  if (!prompt) {
    await ctx.reply('Please provide a prompt');
    return;
  }

  if (!ctx.chatId) {
    await ctx.reply('This command is only available in a chat');
    return;
  }

  await tasks.trigger<ImageTask>('image', { chatId: ctx.chatId, prompt });
}
