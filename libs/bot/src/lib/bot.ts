import { Bot, Context, enhanceStorage, session } from 'grammy';
import { RedisAdapter } from '@grammyjs/storage-redis';
import { Redis } from '@upstash/redis';
import { env } from './env';
import { BotContext, SessionData } from './context';
import { convertToCoreMessages, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { telegramify } from './telegramify';

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
    initial: () =>
      ({
        messages: [],
        usage: {
          total: {
            promptTokens: 0,
            completionTokens: 0,
          },
        },
      } as SessionData),
    getSessionKey: (ctx) => `session:${ctx.chatId?.toString()}`,
  })
);

async function help(ctx: BotContext) {
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
}

bot.command('start', help);

bot.command('help', help);

bot.command('reset', async (ctx) => {
  ctx.session.messages = [];

  await ctx.reply('Conversation reset');
});

bot.command('stats', async (ctx) => {
  console.log(
    `User ${ctx.from?.username} (id: ${ctx.from?.id}) requested their usage statistics`
  );

  const totalPromptTokens = ctx.session.usage.total.promptTokens;
  const totalCompletionTokens = ctx.session.usage.total.completionTokens;

  await ctx.reply(
    `📊 *Usage Statistics*

Total Prompt Tokens: ${totalPromptTokens}
Total Completion Tokens: ${totalCompletionTokens}
`,
    {
      parse_mode: 'MarkdownV2',
    }
  );
});

bot.command('resend', async (ctx) => {
  await ctx.replyWithChatAction('typing');

  // find the last user message
  const lastUserMessage = ctx.session.messages
    .slice()
    .reverse()
    .find((message) => message.role === 'user');

  if (!lastUserMessage) {
    await ctx.reply('No messages to resend');
    return;
  }

  const messages = (ctx.session.messages = ctx.session.messages.slice(
    0,
    ctx.session.messages.indexOf(lastUserMessage) + 1
  ));

  const result = await generateText({
    model: openai('gpt-4o-mini', {
      structuredOutputs: true,
    }),
    temperature: env.TEMPERATURE,
    messages,
    system: env.ASSISTANT_PROMPT,
    maxToolRoundtrips: 2,
    tools: {},
  });

  ctx.session.messages = [...messages, ...result.responseMessages].slice(
    -env.MAX_HISTORY_SIZE
  );

  ctx.session.usage.total.promptTokens += result.usage.promptTokens;
  ctx.session.usage.total.completionTokens += result.usage.completionTokens;

  await ctx.reply(telegramify(result.text), {
    parse_mode: 'MarkdownV2',
  });
});

bot
  .filter(() => env.ENABLE_IMAGE_GENERATION)
  .command('image', async (ctx) => {});

bot.filter(() => env.ENABLE_TTS_GENERATION).command('tts', async (ctx) => {});

bot.filter(Context.has.chatType('group')).command('chat', async (ctx) => {});

bot.on('message:text', async (ctx) => {
  console.log(
    `New message received from user ${ctx.from?.username} (id: ${ctx.from?.id})`
  );

  await ctx.replyWithChatAction('typing');

  const prompt = ctx.message.text.replace(/^\/chat/, '').trim();

  const messages = [
    ...ctx.session.messages,
    ...convertToCoreMessages([
      {
        role: 'user',
        content: prompt,
      },
    ]),
  ];

  const result = await generateText({
    model: openai('gpt-4o-mini', {
      structuredOutputs: true,
    }),
    temperature: env.TEMPERATURE,
    messages,
    system: env.ASSISTANT_PROMPT,
    maxToolRoundtrips: 2,
    tools: {},
  });

  ctx.session.messages = [...messages, ...result.responseMessages].slice(
    -env.MAX_HISTORY_SIZE
  );

  ctx.session.usage.total.promptTokens += result.usage.promptTokens;
  ctx.session.usage.total.completionTokens += result.usage.completionTokens;

  await ctx.reply(telegramify(result.text), {
    parse_mode: 'MarkdownV2',
  });
});
