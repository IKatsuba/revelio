import { tool } from 'ai';
import { z } from 'zod';

import { getPlansDescription, injectBotContext } from '@revelio/bot-utils';
import { injectEnv } from '@revelio/env';

export function getCurrentPlanToolFactory() {
  const ctx = injectBotContext();
  const env = injectEnv();

  return {
    getCurrentPlan: tool({
      description: 'get the current plan of the user.',
      parameters: z.object({}),
      execute: async () => {
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
    }),
  };
}
