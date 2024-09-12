import { Bot, Context, enhanceStorage, session } from 'grammy';
import { RedisAdapter } from '@grammyjs/storage-redis';
import { Redis } from '@upstash/redis';
import { env } from './env';
import { BotContext, SessionData } from './context';

const redis = new Redis({
  url: env.BOT_SESSION_REDIS_URL,
  token: env.BOT_SESSION_REDIS_TOKEN,
  automaticDeserialization: false,
});

export const bot = new Bot<BotContext>(process.env.BOT_TOKEN!);

bot.use(
  session({
    storage: enhanceStorage({
      storage: new RedisAdapter({ instance: redis }),
    }),
    initial: () => ({} as SessionData),
    getSessionKey: (ctx) => `session:${ctx.chatId?.toString()}`,
  })
);

bot.command('start', async (ctx) => {});

bot.command('help', async (ctx) => {
  await ctx.reply(`I'm a ChatGPT bot, talk to me!

/help - Show this message
/reset - Reset the conversation. Optionally pass high-level instructions (e.g. /reset You are a helpful assistant)
/stats - Get your current usage statistics
/resend - Resend the latest message
${
  env.ENABLE_IMAGE_GENERATION
    ? '/image - Generate image from prompt (e.g. /image cat)\n'
    : ''
}
${
  env.ENABLE_TTS_GENERATION
    ? '/tts - Generate speech from text (e.g. /tts my house)\n'
    : ''
}
${Context.has.chatType('group')(ctx) ? '/chat - Chat with the bot!\n' : ''}

Send me a voice message or file and I'll transcribe it for you!
`);
});

bot.command('reset', async (ctx) => {});
bot.command('stats', async (ctx) => {});
bot.command('resend', async (ctx) => {});

bot
  .filter(() => env.ENABLE_IMAGE_GENERATION)
  .command('image', async (ctx) => {});

bot.filter(() => env.ENABLE_TTS_GENERATION).command('tts', async (ctx) => {});

bot.filter(Context.has.chatType('group')).command('chat', async (ctx) => {});
