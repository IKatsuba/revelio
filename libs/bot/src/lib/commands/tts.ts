import { InputFile } from 'grammy';

import { textToSpeech } from '@revelio/llm/server';

import { BotContext } from '../context';

export async function tts(ctx: BotContext) {
  await ctx.replyWithChatAction('typing');

  const prompt = ctx.message?.text?.replace(/^\/tts/, '').trim();

  if (!prompt) {
    await ctx.reply('Please provide a prompt for the speech generation');
    return;
  }

  const blob = await textToSpeech(prompt);

  if (!blob) {
    await ctx.reply('Failed to generate speech');
    return;
  }

  await ctx.replyWithVoice(new InputFile(blob));
}
