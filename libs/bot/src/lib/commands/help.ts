import { BotContext, telegramify } from '@revelio/bot-utils';

export async function help(ctx: BotContext) {
  await ctx.reply(
    telegramify(`👋 **I'm Revelio, your personal assistant!**

Here are some things I can help you with:

💡 **/help** – Show this message
💳 **/billing** – Manage your billing information
📊 **/usage** – Get your current usage statistics

🔄 **/reset** – Reset the conversation. Optionally pass high-level instructions (e.g. /reset You are a helpful assistant)
📩 **/resend** – Resend the latest message
🖼️ **/image** – Generate image from prompt (e.g. /image a cat in the forest)
🔊 **/tts** – Generate speech from text (e.g. /tts Hello, how are you?)

You can also send me text messages, and I'll respond to them. 📜

Send me a voice message or file, and I'll transcribe it for you! 🎤
`),
    {
      parse_mode: 'MarkdownV2',
    },
  );
}
