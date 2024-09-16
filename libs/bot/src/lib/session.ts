import { RedisAdapter } from '@grammyjs/storage-redis';
import { Redis } from '@upstash/redis';
import { enhanceStorage } from 'grammy';

import { env } from '@revelio/env/server';

import { SessionData } from './context';

const sessionRedis = new Redis({
  url: env.BOT_SESSION_REDIS_URL,
  token: env.BOT_SESSION_REDIS_TOKEN,
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
  data: SessionData | ((sessionData: SessionData | undefined) => SessionData),
) {
  data =
    typeof data === 'function'
      ? data((await sessionStorage.read(getSessionKey(chatId))) ?? getInitialSessionData())
      : data;

  return sessionStorage.write(getSessionKey(chatId), data);
}

export function getInitialSessionData(): SessionData {
  return {
    messages: [],
  };
}
