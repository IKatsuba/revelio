import { convertToCoreMessages } from 'ai';

import { BotContext, sendLongText } from '@revelio/bot-utils';
import { env } from '@revelio/env/server';
import { generateText } from '@revelio/llm/server';
import { addTokenUsage } from '@revelio/stripe/server';

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
    console.log('No text generated');
    return;
  }

  await sendLongText(ctx.chatId, result.text);

  await addTokenUsage(ctx.chatId, {
    model: 'gpt-4o-mini',
    mode: 'output',
    tokenCount: result.usage.completionTokens,
  });

  await addTokenUsage(ctx.chatId, {
    model: 'gpt-4o-mini',
    mode: 'input',
    tokenCount: result.usage.promptTokens,
  });
}
