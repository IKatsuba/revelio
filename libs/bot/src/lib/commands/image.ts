import { env } from '@revelio/env/server';
import { generateImage } from '@revelio/llm/server';
import { prisma } from '@revelio/prisma/server';
import { addImageUsage } from '@revelio/stripe/server';

import { BotContext } from '../context';

export async function image(ctx: BotContext) {
  await ctx.replyWithChatAction('typing');

  const prompt = ctx.message?.text?.replace(/^\/image/, '').trim();

  if (!prompt) {
    await ctx.reply('Please provide a prompt for the image generation');
    return;
  }

  const url = await generateImage(prompt);

  if (!url) {
    await ctx.reply('Failed to generate image');
    return;
  }

  await ctx.replyWithPhoto(url);

  const customer = await prisma.customer.findFirst({
    where: { id: ctx.chatId },
  });

  if (!customer) {
    return;
  }

  await addImageUsage(ctx, {
    model: env.IMAGE_MODEL,
    resolution: env.IMAGE_SIZE,
  });
}
