export type Constructor<T = any> = new (...args: any[]) => T;

const _providers = new Map<any, any>();
const _instances = new Map<any, any>();

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
  _providers.set(token, provider);
}

export type InjectionToken<T> = Constructor<T>;

export function createInjectionToken<T>(): InjectionToken<T> {
  return class {} as InjectionToken<T>;
}

export function inject<T>(token: Constructor<T> | InjectionToken<T>): T {
  if (!_instances.has(token)) {
    const provider = _providers.get(token);

    if (!provider) {
      throw new Error(`No provider found for ${token.name}`);
    }

    const instance = provider.instance();

    _instances.set(token, instance);

    return instance;
  }

  return _instances.get(token);
}
