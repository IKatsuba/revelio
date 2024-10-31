import { Composer } from 'grammy';

import { BotContext } from '@revelio/bot-utils';

import { describe } from '../commands/describe';
import { prompt } from '../commands/prompt';
import { tts } from '../commands/tts';

export const groupTaskComposer = new Composer<BotContext>();

groupTaskComposer.command('tts', tts);

groupTaskComposer.on(['message:photo', 'message:document'], describe);

groupTaskComposer.on('message:text', prompt);
