import { AsyncLocalStorage } from 'node:async_hooks';
import { Context, MiddlewareHandler } from 'hono';
import { createMiddleware } from 'hono/factory';

import { provideHonoContext } from './context';

export type Constructor<T = any> = new (...args: any[]) => T;

class Injector {
  private _providers = new WeakMap<any, any>();
  private _instances = new WeakMap<any, any>();

  provide<T>(token: Constructor<T>, provider: Provider<T>): void {
    this._providers.set(token, provider);

    if (this._instances.has(token)) {
      this._instances.delete(token);
    }
  }

  inject<T>(token: Constructor<T>): T {
    if (!this._instances.has(token)) {
      const provider = this._providers.get(token);

      if (!provider) {
        throw new Error(`No provider found for ${token.name}`);
      }

      const instance = provider.instance();

      this._instances.set(token, instance);

      return instance;
    }

    return this._instances.get(token);
  }
}

const injectors = new WeakMap<Context, Injector>();
const asyncLocalStorage = new AsyncLocalStorage<Context>();

export function runInContextMiddleware(handler: MiddlewareHandler): MiddlewareHandler {
  return createMiddleware(async (ctx, next) => {
    const injector = new Injector();

    injectors.set(ctx, injector);

    await asyncLocalStorage.run(ctx, async () => {
      provideHonoContext(ctx);

      await handler(ctx, next);
    });
  });
}

export function runInContext<T>(c: Context, fn: () => T): T {
  const injector = injectors.get(c);

  if (!injector) {
    throw new Error('No injector found');
  }

  return asyncLocalStorage.run(c, () => fn());
}

abstract class Provider<T> {
  abstract instance(): T;
}

class FactoryProvider<T> extends Provider<T> {
  constructor(private factory: () => T) {
    super();
  }

  instance(): T {
    return this.factory();
  }
}

export function factoryProvider<T>(factory: () => T): Provider<T> {
  return new FactoryProvider(factory);
}

class ClassProvider<T> extends Provider<T> {
  constructor(private token: Constructor<T>) {
    super();
  }

  instance(): T {
    return new this.token();
  }
}

export function classProvider<T>(constructor: Constructor<T>): Provider<T> {
  return new ClassProvider(constructor);
}

export function provide<T>(token: Constructor<T>, provider: Provider<T>): void {
  const ctx = asyncLocalStorage.getStore();

  if (!ctx) {
    throw new Error('No context found');
  }

  const injector = injectors.get(ctx);

  injector.provide(token, provider);
}

export type InjectionToken<T> = Constructor<T>;

export function createInjectionToken<T>(): InjectionToken<T> {
  return class {} as InjectionToken<T>;
}

export function inject<T>(token: Constructor<T> | InjectionToken<T>): T {
  const ctx = asyncLocalStorage.getStore();

  if (!ctx) {
    throw new Error(`No context found for token ${token.name}`);
  }

  const injector = injectors.get(ctx);

  return injector.inject(token);
}
