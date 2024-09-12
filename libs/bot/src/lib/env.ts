import { z } from 'zod';

const openaiConfigSchema = z.object({
  OPENAI_API_KEY: z.string(),
  SHOW_USAGE: z
    .string()
    .default('false')
    .transform((value) => value.toLowerCase() === 'true'),
  STREAM: z
    .string()
    .default('true')
    .transform((value) => value.toLowerCase() === 'true'),
  PROXY: z.string().nullable(),
  MAX_HISTORY_SIZE: z.coerce.number().int().default(15),
  MAX_CONVERSATION_AGE_MINUTES: z.coerce.number().int().default(180),
  ASSISTANT_PROMPT: z.string().default('You are a helpful assistant.'),
  MAX_TOKENS: z.coerce.number().int(),
  N_CHOICES: z.coerce.number().int().default(1),
  TEMPERATURE: z.coerce.number().default(1.0),
  IMAGE_MODEL: z.string().default('dall-e-2'),
  IMAGE_QUALITY: z.string().default('standard'),
  IMAGE_STYLE: z.string().default('vivid'),
  IMAGE_SIZE: z.string().default('512x512'),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  ENABLE_FUNCTIONS: z
    .string()
    .default('false')
    .transform((value) => value.toLowerCase() === 'true'),
  FUNCTIONS_MAX_CONSECUTIVE_CALLS: z.coerce.number().int().default(10),
  PRESENCE_PENALTY: z.coerce.number().default(0.0),
  FREQUENCY_PENALTY: z.coerce.number().default(0.0),
  BOT_LANGUAGE: z.string().default('en'),
  SHOW_PLUGINS_USED: z
    .string()
    .default('false')
    .transform((value) => value.toLowerCase() === 'true'),
  WHISPER_PROMPT: z.string().default(''),
  VISION_MODEL: z.string().default('gpt-4-vision-preview'),
  ENABLE_VISION_FOLLOW_UP_QUESTIONS: z
    .string()
    .default('true')
    .transform((value) => value.toLowerCase() === 'true'),
  VISION_PROMPT: z.string().default('What is in this image'),
  VISION_DETAIL: z.string().default('auto'),
  VISION_MAX_TOKENS: z.coerce.number().int().default(300),
  TTS_MODEL: z.string().default('tts-1'),
  TTS_VOICE: z.string().default('alloy'),

  BOT_TOKEN: z.string(),
  ADMIN_USER_IDS: z
    .string()
    .default('')
    .transform((value) => value.split(',')),
  ALLOWED_TELEGRAM_USER_IDS: z
    .string()
    .default('*')
    .transform((value) => value.split(',')),
  ENABLE_QUOTING: z
    .string()
    .default('true')
    .transform((value) => value.toLowerCase() === 'true'),
  ENABLE_IMAGE_GENERATION: z
    .string()
    .default('true')
    .transform((value) => value.toLowerCase() === 'true'),
  ENABLE_TRANSCRIPTION: z
    .string()
    .default('true')
    .transform((value) => value.toLowerCase() === 'true'),
  ENABLE_VISION: z
    .string()
    .default('true')
    .transform((value) => value.toLowerCase() === 'true'),
  ENABLE_TTS_GENERATION: z
    .string()
    .default('true')
    .transform((value) => value.toLowerCase() === 'true'),
  BUDGET_PERIOD: z
    .string()
    .default('monthly')
    .transform((value) => value.toLowerCase()),
  USER_BUDGETS: z.string().default('*'),
  GUEST_BUDGET: z.coerce.number().default(100.0),
  VOICE_REPLY_WITH_TRANSCRIPT_ONLY: z
    .string()
    .default('false')
    .transform((value) => value.toLowerCase() === 'true'),
  VOICE_REPLY_PROMPTS: z
    .string()
    .default('')
    .transform((value) => value.split(';')),
  IGNORE_GROUP_TRANSCRIPTIONS: z
    .string()
    .default('true')
    .transform((value) => value.toLowerCase() === 'true'),
  IGNORE_GROUP_VISION: z
    .string()
    .default('true')
    .transform((value) => value.toLowerCase() === 'true'),
  GROUP_TRIGGER_KEYWORD: z.string().default(''),
  TOKEN_PRICE: z.coerce.number().default(0.002),
  IMAGE_PRICES: z
    .string()
    .default('0.016,0.018,0.02')
    .transform((value) => value.split(',').map(Number)),
  VISION_TOKEN_PRICE: z.coerce.number().default(0.01),
  IMAGE_FORMAT: z.string().default('photo'),
  TTS_PRICES: z
    .string()
    .default('0.015,0.03')
    .transform((value) => value.split(',').map(Number)),
  TRANSCRIPTION_PRICE: z.coerce.number().default(0.006),
  PLUGINS: z
    .string()
    .default('')
    .transform((value) => value.split(',')),
});

export const env = openaiConfigSchema.parse({
  ...process.env,
});
