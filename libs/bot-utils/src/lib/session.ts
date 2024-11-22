import { RedisAdapter } from '@grammyjs/storage-redis';
import { Redis } from '@upstash/redis/cloudflare';
import { enhanceStorage, session } from 'grammy';

import { injectEnv } from '@revelio/env';

import { SessionData } from './context';

function createSessionStorage() {
  const env = injectEnv();

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
  chatId: number,
  data: SessionData | ((sessionData: SessionData) => SessionData | void),
) {
  const sessionStorage = createSessionStorage();

  const fn = typeof data === 'function' ? data : (session: SessionData) => session;
  const session =
    typeof data === 'function'
      ? ((await sessionStorage.read(getSessionKey(chatId))) ?? getInitialSessionData())
      : data;

  await sessionStorage.write(getSessionKey(chatId), fn(session) || session);

  return session;
}

export async function getSession(chatId: number): Promise<SessionData> {
  const sessionStorage = createSessionStorage();
  return (await sessionStorage.read(getSessionKey(chatId))) ?? getInitialSessionData();
}

export function getInitialSessionData(): SessionData {
  return {
    plan: 'free',
  };
}

export const sessionMiddleware = () =>
  session({
    storage: createSessionStorage(),
    getSessionKey: (ctx) => getSessionKey(ctx.chatId),
    initial: () => getInitialSessionData(),
  });
