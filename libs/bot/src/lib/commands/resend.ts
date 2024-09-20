import { env } from '@revelio/env/server';
import { generateText } from '@revelio/llm/server';
import { addTokenUsage } from '@revelio/stripe/server';

import { BotContext } from '../context';
import { sendLongText } from '../utils';

export async function resend(ctx: BotContext) {
  await ctx.replyWithChatAction('typing');

  // find the last user message
  const lastUserMessage = ctx.session.messages
    .slice()
    .reverse()
    .find((message) => message.role === 'user');

  if (!lastUserMessage) {
    await ctx.reply('No messages to resend');
    return;
  }

  const messages = (ctx.session.messages = ctx.session.messages.slice(
    0,
    ctx.session.messages.indexOf(lastUserMessage) + 1,
  ));

  const result = await generateText(messages);

  ctx.session.messages = [...messages, ...result.responseMessages].slice(-env.MAX_HISTORY_SIZE);

  await sendLongText(ctx, result.text);

  await addTokenUsage(ctx, {
    model: 'gpt-4o-mini',
    mode: 'output',
    tokenCount: result.usage.completionTokens,
  });

  await addTokenUsage(ctx, {
    model: 'gpt-4o-mini',
    mode: 'input',
    tokenCount: result.usage.promptTokens,
  });
}
