import { convertToCoreMessages } from 'ai';

import { env } from '@revelio/env/server';
import { generateText, transcribe } from '@revelio/llm/server';

import { BotContext } from '../context';
import { sendLongText } from '../utils';

export async function voice(ctx: BotContext) {
  await ctx.replyWithChatAction('typing');

  const file =
    ctx.message?.voice ?? ctx.message?.audio ?? ctx.message?.video_note ?? ctx.message?.video;

  if (!file) {
    await ctx.reply('Failed to transcribe audio');
  }

  const fileData = await ctx.api.getFile(file!.file_id);

  const text = await transcribe(
    await fetch(`https://api.telegram.org/file/bot${env.BOT_TOKEN}/${fileData.file_path}`),
  );

  const messages = [
    ...ctx.session.messages,
    ...convertToCoreMessages([
      {
        role: 'user',
        content: text,
      },
    ]),
  ];

  const response = await generateText(messages);

  ctx.session.messages = [...messages, ...response.responseMessages].slice(-env.MAX_HISTORY_SIZE);

  await sendLongText(ctx, response.text);
}
