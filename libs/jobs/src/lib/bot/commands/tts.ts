import { InputFile } from 'grammy';

import { api, BotContext } from '@revelio/bot-utils';
import { textToSpeech } from '@revelio/llm/server';

export async function tts(ctx: BotContext) {
  await ctx.replyWithChatAction('record_voice');

  const prompt = ctx.message?.text?.replace(/^\/tts/, '').trim();

  if (!prompt) {
    await ctx.reply('Please provide a prompt for the speech generation');
    return;
  }

  if (!ctx.chatId) {
    await ctx.reply('Failed to get chatId');
    return;
  }

  const audioBuffer = await textToSpeech(prompt);

  if (!audioBuffer) {
    await api.sendMessage(ctx.chatId, 'Failed to generate speech');
    return;
  }

  // payload.prompt.split(/\s+/).length

  await api.sendChatAction(ctx.chatId, 'upload_voice');

  await api.sendVoice(ctx.chatId, new InputFile(audioBuffer));
}
