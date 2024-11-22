import { tool } from 'ai';
import { z } from 'zod';

import { injectBotContext } from '@revelio/bot-utils';

export function setChatLanguageFactory() {
  const ctx = injectBotContext();

  return tool({
    description: 'Set chat language',
    parameters: z.object({
      language: z.string().describe('Language code'),
    }),
    async execute({ language }) {
      ctx.session.language = language;

      return {
        result: `Chat language set to ${language}`,
      };
    },
  });
}
