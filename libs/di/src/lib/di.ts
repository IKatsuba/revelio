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

export function provide<T>(token: Constructor<T>, provider?: Provider<T>): void {
  if (!provider) {
    provider = classProvider(token);
  }

  _providers.set(token, provider);
}

export type InjectionToken<T> = Constructor<T>;

export function createInjectionToken<T>(): InjectionToken<T> {
  return class {} as InjectionToken<T>;
}

export function inject<T>(token: Constructor<T> | InjectionToken<T>): T {
  if (!_providers.has(token)) {
    provide(token);
  }

  if (!_instances.has(token)) {
    _instances.set(token, _providers.get(token).instance());
  }

  return _instances.get(token);
}
