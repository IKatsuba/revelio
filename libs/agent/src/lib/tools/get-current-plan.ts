import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { getPlansDescription, injectBotContext } from '@revelio/bot-utils';
import { injectEnv } from '@revelio/env';

export function getCurrentPlanToolFactory() {
  const ctx = injectBotContext();
  const env = injectEnv();

  return tool(
    async () => {
      if (!ctx.chatId) {
        return {
          error: 'No chatId found',
        };
      }

      return {
        plan: ctx.session.plan,
        plansDescription: getPlansDescription(env),
      };
    },
    {
      name: 'getCurrentPlan',
      description: 'get the current plan of the user.',
      schema: z.object({}),
    },
  );
}
