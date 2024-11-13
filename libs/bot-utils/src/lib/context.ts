import { NeonQueryFunction } from '@neondatabase/serverless';
import { PrismaClient } from '@prisma/client';
import { Redis } from '@upstash/redis/cloudflare';
import { Context, SessionFlavor } from 'grammy';
import OpenAI from 'openai';
import { Stripe } from 'stripe';
import { z } from 'zod';

import { envSchema } from '@revelio/env';

export interface SessionData {
  plan?: 'free' | 'basic' | 'premium';
  language?: string;
}

export type BotContext = Context &
  SessionFlavor<SessionData> & {
    transcription?: string;
    prisma: PrismaClient;
    env: z.infer<typeof envSchema>;
    stripe: Stripe;
    redis: Redis;
    openai: OpenAI;
    sql: NeonQueryFunction<false, false>;
  };
