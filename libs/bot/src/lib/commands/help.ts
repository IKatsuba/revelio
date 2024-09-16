import { BotContext } from '../context';

export async function help(ctx: BotContext) {
  await ctx.reply(`I'm a ChatGPT bot, talk to me!

/help - Show this message
/reset - Reset the conversation. Optionally pass high-level instructions (e.g. /reset You are a helpful assistant)
/stats - Get your current usage statistics
/resend - Resend the latest message
/image - Generate image from prompt (e.g. /image cat)
/tts - Generate speech from text (e.g. /tts my house)
/chat - Chat with the bot!

Send me a voice message or file and I'll transcribe it for you!
`);
}
