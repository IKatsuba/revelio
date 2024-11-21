export type Constructor<T = any> = new (...args: any[]) => T;

const _providers = new Map<any, any>();

export function register<T>(token: Constructor<T>, instance?: T): void {
  if (!instance) {
    instance = new token();
  }

  _providers.set(token, instance);
}

export type InjectionToken<T> = Constructor<T>;

export function createInjectionToken<T>(): InjectionToken<T> {
  return class {} as InjectionToken<T>;
}

export function inject<T>(token: Constructor<T> | InjectionToken<T>): T {
  if (!_providers.has(token)) {
    register(token);
  }

  return _providers.get(token);
}
