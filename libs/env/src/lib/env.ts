import { z } from 'zod';

const envSchema = z.object({
  OPENAI_API_KEY: z.string(),
  OPENAI_API_URL: z.string().default('https://api.openai.com/v1'),
  STREAM: z
    .string()
    .default('true')
    .transform((value) => value.toLowerCase() === 'true'),
  MAX_HISTORY_SIZE: z.coerce.number().int().default(30),
  MAX_HISTORY_MESSAGE_TTL: z.coerce
    .number()
    .int()
    .default(60 * 60 * 24 * 7),
  ASSISTANT_PROMPT: z.string().default(
    `You are a helpful assistant. Answer briefly and to the point. If user asks for crete reminder,
you can ask for time and date. Time and date can be relative to current date. If there is no timezone you can get it from a memory or ask user.
If user ask to generate image, use tool, get result, describe what you generate, but don't include url in answer.
Always answer in a language that user is using.`,
  ),
  MAX_TOKENS: z.coerce.number().int().default(2048),
  MAX_STEPS: z.coerce.number().int().default(5),
  TEMPERATURE: z.coerce.number().default(0),
  IMAGE_MODEL: z.enum(['dall-e-2', 'dall-e-3']).default('dall-e-3'),
  IMAGE_QUALITY: z.enum(['standard', 'hd']).default('standard'),
  IMAGE_STYLE: z.enum(['vivid', 'natural']).default('natural'),
  IMAGE_SIZE: z
    .enum(['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792'])
    .default('1024x1024'),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  WHISPER_PROMPT: z.string().default(''),
  TTS_MODEL: z.string().default('tts-1'),
  TTS_VOICE: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).default('alloy'),

  BOT_TOKEN: z.string(),
  BOT_WEBHOOK_SECRET: z.string().optional(),
  BOT_WEBHOOK_URL: z.string(),

  TELEGRAM_API_URL: z.string().default('https://api.telegram.org'),

  ADMIN_USER_IDS: z
    .string()
    .default('')
    .transform((value) => value.split(',')),
  UPSTASH_REDIS_URL: z.string(),
  UPSTASH_REDIS_TOKEN: z.string(),

  STRIPE_SECRET_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),

  POSTGRES_PRISMA_URL: z.string(),

  UPSTASH_VECTOR_REST_URL: z.string(),
  UPSTASH_VECTOR_REST_TOKEN: z.string(),

  QSTASH_URL: z.string(),
  QSTASH_TOKEN: z.string(),
  QSTASH_CURRENT_SIGNING_KEY: z.string(),
  QSTASH_NEXT_SIGNING_KEY: z.string(),

  REMINDERS_AFTER_NOTIFY_CALLBACK_URL: z.string(),

  CLOUDFLARE_ACCOUNT_ID: z.string(),
  CLOUDFLARE_API_TOKEN: z.string(),

  JINA_API_KEY: z.string(),

  NODE_ENV: z.enum(['development', 'production']).default('development'),
});

export const env = envSchema.parse({
  ...process.env,
});
