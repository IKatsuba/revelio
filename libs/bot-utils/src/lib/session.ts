import { RedisAdapter } from '@grammyjs/storage-redis';
import { Redis } from '@upstash/redis';
import { enhanceStorage, session } from 'grammy';

import { env } from '@revelio/env/server';

import { SessionData } from './context';

const sessionRedis = new Redis({
  url: env.UPSTASH_REDIS_URL,
  token: env.UPSTASH_REDIS_TOKEN,
  automaticDeserialization: false,
});

export const sessionStorage = enhanceStorage<SessionData>({
  storage: new RedisAdapter({ instance: sessionRedis }),
});

export function getSessionKey(chatId?: number) {
  return `session:${chatId?.toString()}`;
}

export async function setSession(
  chatId: number,
  data: SessionData | ((sessionData: SessionData) => SessionData | void),
) {
  const fn = typeof data === 'function' ? data : (session: SessionData) => session;
  const session =
    typeof data === 'function'
      ? ((await sessionStorage.read(getSessionKey(chatId))) ?? getInitialSessionData())
      : data;

  return sessionStorage.write(getSessionKey(chatId), fn(session) || session);
}

export async function getSession(chatId: number): Promise<SessionData> {
  return (await sessionStorage.read(getSessionKey(chatId))) ?? getInitialSessionData();
}

export function getInitialSessionData(): SessionData {
  return {};
}

export const sessionMiddleware = session({
  storage: sessionStorage,
  getSessionKey: (ctx) => getSessionKey(ctx.chatId),
  initial: () => getInitialSessionData(),
});
