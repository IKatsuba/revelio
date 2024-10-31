import { convertToCoreMessages, CoreMessage } from 'ai';

import { BotContext, sendLongText } from '@revelio/bot-utils';
import { env } from '@revelio/env/server';
import { generateTextFactory } from '@revelio/llm/server';

export async function prompt(ctx: BotContext) {
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

  if (!ctx.message?.message_id) {
    await ctx.reply('Message id is missing');
    return;
  }

  if (!ctx.from?.id) {
    await ctx.reply('User id is missing');
    return;
  }

  const messages = excludeToolCallMessages([
    ...ctx.session.messages,
    ...convertToCoreMessages([
      {
        role: 'user',
        content: prompt ?? '',
      },
    ]),
  ]).slice(-env.MAX_HISTORY_SIZE);

  const generateText = generateTextFactory({
    chatId: ctx.chatId,
    messageId: ctx.message.message_id,
    userId: ctx.from.id,
    plan: ctx.session.plan,
  });

  const result = await generateText(messages);

  for (const message of result.response.messages) {
    if (message.role === 'tool') {
      const toolResult = message.content.find((content) => content.type === 'tool-result');

      if (toolResult && toolResult.toolName === 'generateImage' && toolResult.result) {
        const url = (toolResult.result as { url: string }).url;

        if (!url) {
          console.error('Failed to generate image');
          continue;
        }

        await ctx.replyWithChatAction('upload_photo');

        await ctx.replyWithPhoto(url);
      }
    }
  }

  ctx.session.messages = excludeToolCallMessages([...messages, ...result.response.messages]).slice(
    -env.MAX_HISTORY_SIZE,
  );

  if (!result.text) {
    console.log('No text generated');
    return;
  }

  await sendLongText(ctx, result.text);
}

function excludeToolCallMessages(messages: CoreMessage[]) {
  return messages.filter((message) => {
    if (typeof message.content === 'string') {
      return true;
    }

    if (message.role !== 'assistant' && message.role !== 'tool') {
      return true;
    }

    return !message.content.find(
      (content) => content.type === 'tool-call' || content.type === 'tool-result',
    );
  });
}
