import { IAuthKeysRepository, MemoryStorage } from '@mtcute/core';
import {
  IMtStorageProvider,
  ITelegramStorageProvider,
  MemoryStorageDriver,
  TelegramClient,
} from '@mtcute/node';
import { logger } from '@trigger.dev/sdk/v3';
import { Redis } from '@upstash/redis/cloudflare';

import { env } from '@revelio/env';

const tdlibRedis = new Redis({
  url: env.UPSTASH_REDIS_URL,
  token: env.UPSTASH_REDIS_TOKEN,
  automaticDeserialization: false,
});

class AuthKeysRepository implements IAuthKeysRepository {
  readonly state: Redis;

  constructor(readonly _driver: MemoryStorageDriver) {
    this.state = this._driver.getState('authKeys', () => tdlibRedis);
  }

  async set(dc: number, key: Uint8Array | null): Promise<void> {
    await logger.trace('authKeys.set', async () => {
      if (key) {
        await this.state.set(`authKeys:${dc}`, Buffer.from(key).toString('base64'));
      } else {
        await this.state.del(`authKeys:${dc}`);
      }
    });
  }

  async get(dc: number): Promise<Uint8Array | null> {
    return logger.trace('authKeys.get', async () => {
      const base64Key = await this.state.get<string>(`authKeys:${dc}`);

      if (!base64Key) {
        return null;
      }

      return Uint8Array.from(Buffer.from(base64Key, 'base64'));
    });
  }

  async setTemp(dc: number, idx: number, key: Uint8Array | null, expires: number): Promise<void> {
    const k = `${dc}:${idx}`;

    await logger.trace('authKeys.setTemp', async () => {
      if (key) {
        await this.state.set(`authKeysTemp:${k}`, Buffer.from(key).toString('base64'));
        await this.state.set(`authKeysTempExpiry:${k}`, expires);
      } else {
        await this.state.del(`authKeysTemp:${k}`);
        await this.state.del(`authKeysTempExpiry:${k}`);
      }
    });
  }

  async getTemp(dc: number, idx: number, now: number): Promise<Uint8Array | null> {
    const k = `${dc}:${idx}`;

    return logger.trace('authKeys.getTemp', async () => {
      if (now > (((await this.state.get(`authKeysTempExpiry:${k}`)) as number) ?? 0)) {
        return null;
      }

      const base64Key = await this.state.get<string>(`authKeysTemp:${k}`);

      if (!base64Key) {
        return null;
      }

      return Uint8Array.from(Buffer.from(base64Key, 'base64'));
    });
  }

  async deleteByDc(dc: number): Promise<void> {
    await logger.trace('authKeys.deleteByDc', async () => {
      await this.state.del(`authKeys:${dc}`);

      const keys = (
        await this.state
          .pipeline()
          .keys(`authKeysTemp:${dc}:*`)
          .keys(`authKeysTempExpiry:${dc}:*`)
          .exec()
      ).flat();

      await this.state.del(...keys);
    });
  }

  async deleteAll(): Promise<void> {
    await logger.trace('authKeys.deleteAll', async () => {
      const keys = (
        await this.state
          .pipeline()
          .keys('authKeys:*')
          .keys('authKeysTemp:*')
          .keys('authKeysTempExpiry:*')
          .exec()
      ).flat();

      await this.state.del(...keys);
    });
  }
}

const memoryStorage = new MemoryStorage();

class BaseStorage implements IMtStorageProvider, ITelegramStorageProvider {
  readonly driver: MemoryStorageDriver = new MemoryStorageDriver();
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  readonly kv = new memoryStorage.kv.constructor(this.driver);
  readonly authKeys = new AuthKeysRepository(this.driver);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  readonly peers = new memoryStorage.peers.constructor(this.driver);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  readonly refMessages = new memoryStorage.refMessages.constructor(this.driver);
}

export async function createTDLib() {
  const tg = new TelegramClient({
    apiId: env.TELEGRAM_API_ID,
    apiHash: env.TELEGRAM_API_HASH,
    disableUpdates: true,
    storage: new BaseStorage(),
  });

  await logger.trace('tg.start', () => tg.start({ botToken: env.BOT_TOKEN }));

  return tg;
}
