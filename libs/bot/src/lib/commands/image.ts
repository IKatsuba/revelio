import { env } from '@revelio/env/server';
import { generateImage } from '@revelio/llm/server';
import { addImageUsage } from '@revelio/stripe/server';

import { BotContext } from '../context';

export async function image(ctx: BotContext) {
  const prompt = ctx.message?.text?.replace(/^\/image/, '').trim();

  if (!prompt) {
    await ctx.reply('Please provide a prompt for the image generation');
    return;
  }

  await ctx.replyWithChatAction('upload_photo');

  const url = await generateImage(prompt);

  if (!url) {
    await ctx.reply('Failed to generate image');
    return;
  }

  await ctx.replyWithChatAction('upload_photo');

  await ctx.replyWithPhoto(url);

  await addImageUsage(ctx, {
    model: env.IMAGE_MODEL,
    resolution: env.IMAGE_SIZE,
  });
}
