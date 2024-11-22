import { AnalyticsEngineDataset, D1Database } from '@cloudflare/workers-types';
import { trace } from '@opentelemetry/api';
import { Context } from 'hono';
import { z } from 'zod';

import {
  createInjectionToken,
  factoryProvider,
  inject,
  injectHonoContext,
  provide,
} from '@revelio/di';

export const envSchema = z.object({
  OPENAI_API_KEY: z.string(),
  OPENAI_API_URL: z.string().default('https://api.openai.com/v1'),
  PERPLEXITY_API_KEY: z.string(),
  PERPLEXITY_API_URL: z.string().default('https://api.perplexity.ai'),
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
Always answer in a language that user is using. You are based on GPT-4o model.`,
  ),
  MAX_TOKENS: z.coerce.number().int().default(2048),
  MAX_STEPS: z.coerce.number().int().default(5),
  TEMPERATURE: z.coerce.number().default(0),
  IMAGE_MODEL: z.enum(['dall-e-2', 'dall-e-3']).default('dall-e-2'),
  IMAGE_QUALITY: z.enum(['standard', 'hd']).default('standard'),
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
  TELEGRAM_API_ID: z.coerce.number().int(),
  TELEGRAM_API_HASH: z.string(),

  ADMIN_USER_IDS: z
    .string()
    .default('')
    .transform((value) => value.split(',')),
  UPSTASH_REDIS_URL: z.string(),
  UPSTASH_REDIS_TOKEN: z.string(),

  POSTGRES_PRISMA_URL: z.string(),

  UPSTASH_VECTOR_REST_URL: z.string(),
  UPSTASH_VECTOR_REST_TOKEN: z.string(),

  QSTASH_URL: z.string(),
  QSTASH_TOKEN: z.string(),
  QSTASH_CURRENT_SIGNING_KEY: z.string(),
  QSTASH_NEXT_SIGNING_KEY: z.string(),

  REMINDERS_AFTER_NOTIFY_CALLBACK_URL: z.string(),

  CLOUDFLARE_ACCOUNT_ID: z.string(),
  CLOUDFLARE_IMAGE_API_TOKEN: z.string(),

  JINA_API_KEY: z.string(),

  NODE_ENV: z.enum(['development', 'production']).default('development'),

  WEATHER_API_KEY: z.string(),

  BASELIME_API_KEY: z.string().optional(),

  CHECK_PLAN_CALLBACK_URL: z.string(),

  BASIC_PLAN_PRICE: z.coerce.number().int().default(350),
  PREMIUM_PLAN_PRICE: z.coerce.number().int().default(700),

  LANGCHAIN_TRACING_V2: z
    .string()
    .default('false')
    .transform((value) => value.toLowerCase() === 'true'),
  LANGCHAIN_ENDPOINT: z.string().default('https://api.smith.langchain.com'),
  LANGCHAIN_API_KEY: z.string().optional(),
  LANGCHAIN_PROJECT: z.string().optional(),

  // D1
  revelioDB: z.any() satisfies z.ZodType<D1Database>,
  revelioMessagesDB: z.any() satisfies z.ZodType<D1Database>,
  analytics: z.any() satisfies z.ZodType<AnalyticsEngineDataset>,
});

export function getEnv(c?: Context) {
  const { data, error } = envSchema.safeParse(c?.env ?? process.env);

  if (error) {
    error.errors.forEach((e) => {
      console.error(e.message);

      trace.getActiveSpan()?.recordException(e);
    });

    throw new Error(error.message);
  }

  return data;
}

const ENV_TOKEN = createInjectionToken<z.infer<typeof envSchema>>();

provide(
  ENV_TOKEN,
  factoryProvider(() => getEnv(injectHonoContext())),
);

export function injectEnv(): z.infer<typeof envSchema> {
  return inject(ENV_TOKEN);
}
