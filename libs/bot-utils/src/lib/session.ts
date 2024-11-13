import { RedisAdapter } from '@grammyjs/storage-redis';
import { Redis } from '@upstash/redis/cloudflare';
import { enhanceStorage, session } from 'grammy';
import { Context } from 'hono';

import { getEnv } from '@revelio/env';

import { SessionData } from './context';

function createSessionStorage(c: Context) {
  const env = getEnv(c);

  const sessionRedis = new Redis({
    url: env.UPSTASH_REDIS_URL,
    token: env.UPSTASH_REDIS_TOKEN,
    automaticDeserialization: false,
  });

  return enhanceStorage<SessionData>({
    storage: new RedisAdapter({ instance: sessionRedis }),
  });
}

export function getSessionKey(chatId?: number) {
  return `session:${chatId?.toString()}`;
}

export async function setSession(
  c: Context,
  chatId: number,
  data: SessionData | ((sessionData: SessionData) => SessionData | void),
) {
  const sessionStorage = createSessionStorage(c);

  const fn = typeof data === 'function' ? data : (session: SessionData) => session;
  const session =
    typeof data === 'function'
      ? ((await sessionStorage.read(getSessionKey(chatId))) ?? getInitialSessionData())
      : data;

  return sessionStorage.write(getSessionKey(chatId), fn(session) || session);
}

export async function getSession(c: Context, chatId: number): Promise<SessionData> {
  const sessionStorage = createSessionStorage(c);
  return (await sessionStorage.read(getSessionKey(chatId))) ?? getInitialSessionData();
}

export function getInitialSessionData(): SessionData {
  return {
    plan: 'free',
  };
}

export const sessionMiddleware = (c: Context) =>
  session({
    storage: createSessionStorage(c),
    getSessionKey: (ctx) => getSessionKey(ctx.chatId),
    initial: () => getInitialSessionData(),
  });
