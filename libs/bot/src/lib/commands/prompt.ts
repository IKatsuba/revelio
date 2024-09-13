import { convertToCoreMessages } from 'ai';

import { env } from '@revelio/env/server';
import { generateText } from '@revelio/llm/server';

import { BotContext } from '../context';
import { sendLongText } from '../utils';

export async function prompt(ctx: BotContext) {
  console.log(`New message received from user ${ctx.from?.username} (id: ${ctx.from?.id})`);

  await ctx.replyWithChatAction('typing');

  const prompt = ctx.message?.text?.replace(/^\/chat/, '').trim();

  const messages = [
    ...ctx.session.messages,
    ...convertToCoreMessages([
      {
        role: 'user',
        content: prompt ?? '',
      },
    ]),
  ];

  const result = await generateText(messages);

  ctx.session.messages = [...messages, ...result.responseMessages].slice(-env.MAX_HISTORY_SIZE);

  if (!result.text) {
    return;
  }

  await sendLongText(ctx, result.text);
}
