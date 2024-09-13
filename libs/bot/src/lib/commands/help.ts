import { Context } from 'grammy';

import { env } from '@revelio/env/server';

import { BotContext } from '../context';

export async function help(ctx: BotContext) {
  await ctx.reply(`I'm a ChatGPT bot, talk to me!

/help - Show this message
/reset - Reset the conversation. Optionally pass high-level instructions (e.g. /reset You are a helpful assistant)
/stats - Get your current usage statistics
/resend - Resend the latest message
${env.ENABLE_IMAGE_GENERATION ? '/image - Generate image from prompt (e.g. /image cat)\n' : ''}
${env.ENABLE_TTS_GENERATION ? '/tts - Generate speech from text (e.g. /tts my house)\n' : ''}
${Context.has.chatType('group')(ctx) ? '/chat - Chat with the bot!\n' : ''}

Send me a voice message or file and I'll transcribe it for you!
`);
}
