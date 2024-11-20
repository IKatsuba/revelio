import { tool } from 'ai';
import { z } from 'zod';

import { BotContext, getPlansDescription } from '@revelio/bot-utils';

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
          plansDescription: getPlansDescription(ctx.env),
        };
      },
    }),
  };
}
