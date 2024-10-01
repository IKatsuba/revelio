import { BotContext, sendLongText } from '@revelio/bot-utils';
import { env } from '@revelio/env/server';
import { generateText } from '@revelio/llm/server';
import { addTokenUsage } from '@revelio/stripe/server';

export async function describe(ctx: BotContext) {
  await ctx.replyWithChatAction('typing');

  const photos = ctx.message?.photo ?? [];

  // find the biggest photo
  const photo =
    ctx.message?.document ??
    photos.reduce(
      (acc, cur) => ((cur.file_size ?? 0) > (acc.file_size ?? 0) ? cur : acc),
      photos[0],
    );

  if (!photo || ('mime_type' in photo && !photo.mime_type?.startsWith('image/'))) {
    await ctx.reply('Failed to transcribe image');
    return;
  }

  const fileData = await ctx.api.getFile(photo.file_id);

  const response = await generateText([
    {
      role: 'user',
      content: [
        { type: 'text', text: ctx.message?.caption ?? 'What’s in this image?' },
        {
          type: 'image',
          image: new URL(`https://api.telegram.org/file/bot${env.BOT_TOKEN}/${fileData.file_path}`),
        },
      ],
    },
  ]);

  await sendLongText(ctx.chatId, response.text);

  await addTokenUsage(ctx.chatId, {
    model: 'gpt-4o-mini',
    mode: 'output',
    tokenCount: response.usage.completionTokens,
  });

  await addTokenUsage(ctx.chatId, {
    model: 'gpt-4o-mini',
    mode: 'input',
    tokenCount: response.usage.promptTokens,
  });
}
