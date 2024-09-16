import { NextFunction } from 'grammy';

import { BotContext } from '../context';

export async function paywall(ctx: BotContext, next: NextFunction) {
  await next();
}
