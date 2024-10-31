import { Composer } from 'grammy';

import { BotContext } from '@revelio/bot-utils';

import { prompt } from '../commands/prompt';
import { tts } from '../commands/tts';

export const groupTaskComposer = new Composer<BotContext>();

groupTaskComposer.command('tts', tts);

groupTaskComposer.on(['message:text', 'message:photo', 'message:document'], prompt);
