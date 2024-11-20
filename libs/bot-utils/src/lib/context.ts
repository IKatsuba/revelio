import { PrismaClient } from '@prisma/client';
import { Redis } from '@upstash/redis/cloudflare';
import { Context, SessionFlavor } from 'grammy';
import { Context as HonoContext } from 'hono';
import OpenAI from 'openai';
import { z } from 'zod';

import { Analytics } from '@revelio/analytics';
import { envSchema } from '@revelio/env';
import { WorkerLogger } from '@revelio/logger';

export interface SessionData {
  plan?: 'free' | 'basic' | 'premium';
  language?: string;
}

export type BotContext = Context &
  SessionFlavor<SessionData> & {
    transcription?: string;
    prisma: PrismaClient;
    env: z.infer<typeof envSchema>;
    redis: Redis;
    openai: OpenAI;
    analytics: Analytics;
    c: HonoContext;
    logger: WorkerLogger;
  };
