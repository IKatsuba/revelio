import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { injectBotContext } from '@revelio/bot-utils';

export function setChatLanguageFactory() {
  const ctx = injectBotContext();

  return tool(
    async ({ language }) => {
      ctx.session.language = language;

      return {
        result: `Chat language set to ${language}`,
      };
    },
    {
      name: 'setChatLanguage',
      description: 'Set chat language',
      schema: z.object({
        language: z.string().describe('Language code'),
      }),
    },
  );
}
