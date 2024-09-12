import { Bot, Context, enhanceStorage, InputFile, session } from 'grammy';
import { RedisAdapter } from '@grammyjs/storage-redis';
import { Redis } from '@upstash/redis';
import { env } from './env';
import { BotContext, SessionData } from './context';
import { convertToCoreMessages, generateText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { telegramify } from './telegramify';
import OpenAI from 'openai';
import * as fs from 'node:fs';
import { z } from 'zod';

const redis = new Redis({
  url: env.BOT_SESSION_REDIS_URL,
  token: env.BOT_SESSION_REDIS_TOKEN,
  automaticDeserialization: false,
});

const openaiClient = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export const bot = new Bot<BotContext>(env.BOT_TOKEN!);

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

  await ctx.reply(telegramify(result.text), {
    parse_mode: 'MarkdownV2',
  });
});

bot
  .filter(() => env.ENABLE_IMAGE_GENERATION)
  .command('image', async (ctx) => {
    await ctx.replyWithChatAction('typing');

    const prompt = ctx.message?.text.replace(/^\/image/, '').trim();

    if (!prompt) {
      await ctx.reply('Please provide a prompt for the image generation');
      return;
    }

    const result = await openaiClient.images.generate({
      prompt,
      n: 1,
      model: env.IMAGE_MODEL,
      quality: env.IMAGE_QUALITY,
      style: env.IMAGE_STYLE,
      size: env.IMAGE_SIZE,
    });

    const url = result.data[0].url;

    if (!url) {
      await ctx.reply('Failed to generate image');
      return;
    }

    await ctx.replyWithPhoto(url);
  });

bot
  .filter(() => env.ENABLE_TTS_GENERATION)
  .command('tts', async (ctx) => {
    await ctx.replyWithChatAction('typing');

    const prompt = ctx.message?.text.replace(/^\/tts/, '').trim();

    if (!prompt) {
      await ctx.reply('Please provide a prompt for the speech generation');
      return;
    }

    const result = await openaiClient.audio.speech.create({
      input: prompt,
      voice: env.TTS_VOICE,
      model: env.TTS_MODEL,
      response_format: 'opus',
    });

    const blob = Buffer.from(await result.arrayBuffer());

    if (!blob) {
      await ctx.reply('Failed to generate speech');
      return;
    }

    await ctx.replyWithVoice(new InputFile(fs.ReadStream.from(blob)));
  });

function onlyPrivateChatAndTextMessage(ctx: BotContext) {
  return (
    Context.has.chatType('private')(ctx) &&
    Context.has.filterQuery('message:text')(ctx)
  );
}

function onlyGroupChatAndCommandChat(ctx: BotContext) {
  return (
    Context.has.chatType(['group', 'supergroup'])(ctx) &&
    Context.has.command('chat')(ctx)
  );
}

bot.filter(
  (ctx) =>
    onlyPrivateChatAndTextMessage(ctx) || onlyGroupChatAndCommandChat(ctx),
  async (ctx) => {
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
      tools: {
        getCryptoRate: tool({
          description: 'get the current rate of a cryptocurrency',
          parameters: z.object({
            currency: z.string().describe('the currency code'),
          }),
          execute: async ({ currency }) => {
            const response = await fetch(
              `https://api.coindesk.com/v1/bpi/currentprice/${currency}.json`
            );
            return response.json();
          },
        }),
        moderateContent: tool({
          description: 'moderate the content',
          parameters: z.object({
            text: z.string().describe('the text to moderate'),
          }),
          execute: async ({ text }) =>
            openaiClient.moderations.create({ input: text }),
        }),
      },
    });

    ctx.session.messages = [...messages, ...result.responseMessages].slice(
      -env.MAX_HISTORY_SIZE
    );

    if (!result.text) {
      return;
    }

    for (const chunk of splitTextIntoChunks(result.text)) {
      await ctx.reply(telegramify(chunk), {
        parse_mode: 'MarkdownV2',
      });
    }
  }
);

bot
  .filter(() => env.ENABLE_TRANSCRIPTION)
  .on(
    ['message:voice', 'message:audio', 'message:video_note', 'message:video'],
    async (ctx) => {
      await ctx.replyWithChatAction('typing');

      const file =
        ctx.message.voice ??
        ctx.message.audio ??
        ctx.message.video_note ??
        ctx.message.video;

      if (!file) {
        await ctx.reply('Failed to transcribe audio');
      }

      const fileData = await ctx.api.getFile(file!.file_id);

      const result = await openaiClient.audio.transcriptions.create({
        model: 'whisper-1',
        file: await fetch(
          `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${fileData.file_path}`
        ),
        prompt: env.WHISPER_PROMPT,
      });

      const messages = [
        ...ctx.session.messages,
        ...convertToCoreMessages([
          {
            role: 'user',
            content: result.text,
          },
        ]),
      ];

      const response = await generateText({
        model: openai('gpt-4o-mini', {
          structuredOutputs: true,
        }),
        temperature: env.TEMPERATURE,
        messages,
        system: env.ASSISTANT_PROMPT,
        maxToolRoundtrips: 2,
        tools: {},
      });

      ctx.session.messages = [...messages, ...response.responseMessages].slice(
        -env.MAX_HISTORY_SIZE
      );

      for (const chunk of splitTextIntoChunks(response.text)) {
        await ctx.reply(telegramify(chunk), {
          parse_mode: 'MarkdownV2',
        });
      }
    }
  );

bot
  .filter(() => env.ENABLE_VISION)
  .on(['message:photo', 'message:document'], async (ctx) => {
    await ctx.replyWithChatAction('typing');

    const file = ctx.message.photo?.[0] ?? ctx.message.document;

    if (
      !file ||
      ('mime_type' in file && !file.mime_type?.startsWith('image/'))
    ) {
      await ctx.reply('Failed to transcribe image');
    }

    const fileData = await ctx.api.getFile(file!.file_id);

    const response = await generateText({
      model: openai('gpt-4o-mini'),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What’s in this image?' },
            {
              type: 'image',
              image: new URL(
                `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${fileData.file_path}`
              ),
            },
          ],
        },
      ],
    });

    for (const chunk of splitTextIntoChunks(response.text)) {
      await ctx.reply(chunk);
    }
  });

function splitTextIntoChunks(text: string, chunkSize = 4096) {
  const chunks = [];

  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }

  return chunks;
}
