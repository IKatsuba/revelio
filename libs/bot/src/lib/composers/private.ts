import { Composer } from 'grammy';

import { billing } from '../commands/billing';
import { describe } from '../commands/describe';
import { help } from '../commands/help';
import { image } from '../commands/image';
import { prompt } from '../commands/prompt';
import { resend } from '../commands/resend';
import { reset } from '../commands/reset';
import { start } from '../commands/start';
import { tts } from '../commands/tts';
import { voice } from '../commands/voice';
import { BotContext } from '../context';
import { paywall } from '../middlewares/paywall';

export const privateComposer = new Composer<BotContext>();

privateComposer.command('start', start);
privateComposer.command('help', help);
privateComposer.command('reset', reset);
privateComposer.command('resend', paywall, resend);
privateComposer.command('image', paywall, image);
privateComposer.command('tts', paywall, tts);
privateComposer.command('billing', billing);

privateComposer.on('message:text', paywall, prompt);
privateComposer.on(
  ['message:voice', 'message:audio', 'message:video_note', 'message:video'],
  paywall,
  voice,
);
privateComposer.on(['message:photo', 'message:document'], paywall, describe);
