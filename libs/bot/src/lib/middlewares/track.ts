import { Middleware } from 'grammy';

export function track(name: string): Middleware {
  return async (ctx, next) => {
    console.log(name, {
      fromUser: ctx.from?.username ?? 'unknown',
      chatId: ctx.chat?.id ?? 0,
      chatType: ctx.chat?.type ?? 'unknown',
    });

    await next();
  };
}
