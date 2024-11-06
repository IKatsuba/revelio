import { tool } from 'ai';
import { z } from 'zod';

import { BotContext, plansDescription } from '@revelio/bot-utils';

export function getCurrentPlanToolFactory(ctx: BotContext) {
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
          plansDescription,
        };
      },
    }),
  };
}
