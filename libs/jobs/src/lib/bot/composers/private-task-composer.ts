import { Composer } from 'grammy';

import { BotContext } from '@revelio/bot-utils';

import { describe } from '../commands/describe';
import { prompt } from '../commands/prompt';
import { tts } from '../commands/tts';
import { voice } from '../commands/voice';

export const privateTaskComposer = new Composer<BotContext>();

privateTaskComposer.command('tts', tts);

privateTaskComposer.on(['message:photo', 'message:document'], describe);

privateTaskComposer.on(
  ['message:voice', 'message:audio', 'message:video_note', 'message:video'],
  voice,
);

privateTaskComposer.on('message:text', prompt);
