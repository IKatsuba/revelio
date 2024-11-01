import { BotContext, telegramify } from '@revelio/bot-utils';

export async function help(ctx: BotContext) {
  await ctx.reply(
    telegramify(`👋 **I'm Revelio, your personal assistant!**

Here are some things I can help you with:

💡 **/help** – Show this message
💳 **/billing** – Manage your billing information
📊 **/usage** – Get your current usage statistics

🔄 **/reset** – Reset the conversation.

You can also send me text messages, and I'll respond to them. 📜

Send me a voice message or file, and I'll transcribe it for you! 🎤
`),
    {
      parse_mode: 'MarkdownV2',
    },
  );
}
