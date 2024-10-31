import { Ratelimit } from '@upstash/ratelimit';
import { Composer } from 'grammy';

import { BotContext } from '@revelio/bot-utils';

import { billing, callbackQuerySubscriptionFree } from '../commands/billing';
import { describe } from '../commands/describe';
import { help } from '../commands/help';
import { prompt } from '../commands/prompt';
import { reset } from '../commands/reset';
import { start } from '../commands/start';
import { tts } from '../commands/tts';
import { usage } from '../commands/usage';
import { voice } from '../commands/voice';
import { paywall } from '../middlewares/paywall';
import { rateLimit } from '../middlewares/rate-limit';
import { track } from '../middlewares/track';

export const privateWebhookComposer = new Composer<BotContext>();

privateWebhookComposer.command('start', track('command:start'), start);
privateWebhookComposer.command('help', track('command:help'), help);
privateWebhookComposer.command('reset', track('command:reset'), paywall, reset);
privateWebhookComposer.command('tts', track('command:tts'), paywall, tts);
privateWebhookComposer.command('billing', track('command:billing'), billing);
privateWebhookComposer.callbackQuery(
  'subscription:free',
  track('callbackQuery:billing'),
  callbackQuerySubscriptionFree,
);
privateWebhookComposer.command('usage', track('command:usage'), paywall, usage);

privateWebhookComposer.on(
  'message:text',
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
  prompt,
);
privateWebhookComposer.on(
  ['message:voice', 'message:audio', 'message:video_note', 'message:video'],
  track('message:media'),
  paywall,
  voice,
);
privateWebhookComposer.on(
  ['message:photo', 'message:document'],
  track('message:photo'),
  paywall,
  describe,
);
