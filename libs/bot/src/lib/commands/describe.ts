import { env } from '@revelio/env/server';
import { generateText } from '@revelio/llm/server';

import { BotContext } from '../context';
import { sendLongText } from '../utils';

export async function describe(ctx: BotContext) {
  await ctx.replyWithChatAction('typing');

  const file = ctx.message?.photo?.[0] ?? ctx.message?.document;

  if (!file || ('mime_type' in file && !file.mime_type?.startsWith('image/'))) {
    await ctx.reply('Failed to transcribe image');
  }

  const fileData = await ctx.api.getFile(file!.file_id);

  const response = await generateText([
    {
      role: 'user',
      content: [
        { type: 'text', text: 'What’s in this image?' },
        {
          type: 'image',
          image: new URL(`https://api.telegram.org/file/bot${env.BOT_TOKEN}/${fileData.file_path}`),
        },
      ],
    },
  ]);

  await sendLongText(ctx, response.text);
}
