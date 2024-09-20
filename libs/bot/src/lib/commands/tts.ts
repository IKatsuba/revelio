import { InputFile } from 'grammy';

import { env } from '@revelio/env/server';
import { textToSpeech } from '@revelio/llm/server';
import { addSpeechUsage } from '@revelio/stripe/server';

import { BotContext } from '../context';

export async function tts(ctx: BotContext) {
  await ctx.replyWithChatAction('record_voice');

  const prompt = ctx.message?.text?.replace(/^\/tts/, '').trim();

  if (!prompt) {
    await ctx.reply('Please provide a prompt for the speech generation');
    return;
  }

  const audioBuffer = await textToSpeech(prompt);

  if (!audioBuffer) {
    await ctx.reply('Failed to generate speech');
    return;
  }

  await ctx.replyWithChatAction('upload_voice');

  await ctx.replyWithVoice(new InputFile(audioBuffer));

  await addSpeechUsage(ctx, {
    model: env.TTS_MODEL,
    characterCount: prompt.split(/\s+/).length,
  });
}
