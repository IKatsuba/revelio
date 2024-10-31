import { Composer } from 'grammy';

import { BotContext } from '@revelio/bot-utils';

import { prompt } from '../commands/prompt';

export const groupTaskComposer = new Composer<BotContext>();

groupTaskComposer.on(['message:text', 'message:photo', 'message:document'], prompt);
