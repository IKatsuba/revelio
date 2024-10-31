import { Composer } from 'grammy';

import { BotContext } from '@revelio/bot-utils';

import { prompt } from '../commands/prompt';
import { transcribeMiddleware } from '../middlewares/transcribe';

export const privateTaskComposer = new Composer<BotContext>();

privateTaskComposer.on(
  ['message:voice', 'message:audio', 'message:video_note', 'message:video'],
  transcribeMiddleware(),
  prompt,
);

privateTaskComposer.on(['message:text', 'message:photo', 'message:document'], prompt);
