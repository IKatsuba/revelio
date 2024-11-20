import { Ratelimit } from '@upstash/ratelimit';
import { Composer } from 'grammy';

import { BotContext } from '@revelio/bot-utils';

import {
  billing,
  callbackQuerySubscriptionCancel,
  callbackQuerySubscriptionFree,
} from '../commands/billing';
import { help } from '../commands/help';
import { prompt } from '../commands/prompt';
import { reset } from '../commands/reset';
import { start } from '../commands/start';
import { paywall } from '../middlewares/paywall';
import { rateLimit } from '../middlewares/rate-limit';
import { track } from '../middlewares/track';
import { transcribeMiddleware } from '../middlewares/transcribe';

export const privateWebhookComposer = new Composer<BotContext>();

privateWebhookComposer.command('start', track('command:start'), start);
privateWebhookComposer.command('help', track('command:help'), help);
privateWebhookComposer.command('reset', track('command:reset'), paywall, reset);
privateWebhookComposer.command('billing', track('command:billing'), billing);
privateWebhookComposer.callbackQuery(
  'subscription:free',
  track('callbackQuery:subscription:free'),
  callbackQuerySubscriptionFree,
);
privateWebhookComposer.callbackQuery(
  'subscription:cancel',
  track('callbackQuery:subscription:cancel'),
  callbackQuerySubscriptionCancel,
);

privateWebhookComposer.on(
  [
    'message:text',
    'message:photo',
    'message:document',
    'message:voice',
    'message:audio',
    'message:video_note',
    'message:video',
  ],
  track('message:text'),
  paywall,
  rateLimit({
    limiter: {
      free: Ratelimit.fixedWindow(10, '1d'),
      basic: Ratelimit.fixedWindow(100, '1d'),
      premium: Ratelimit.fixedWindow(500, '1d'),
    },
    name: 'text',
  }),
  transcribeMiddleware(),
  prompt,
);
