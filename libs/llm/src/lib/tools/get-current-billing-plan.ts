import { tool } from 'ai';
import { z } from 'zod';

import { BotContext } from '@revelio/bot-utils';
import { prisma } from '@revelio/prisma/server';
import { stripe } from '@revelio/stripe/server';

export function getCurrentBillingPlanToolFactory(ctx: BotContext) {
  return {
    getCurrentBillingPlan: tool({
      description: 'get the current billing plan of the user.',
      parameters: z.object({}),
      execute: async () => {
        if (!ctx.chatId) {
          return {
            error: 'No chatId found',
          };
        }

        const customer = await prisma.customer.findUnique({
          where: { id: ctx.chatId.toString() },
        });

        if (!customer) {
          return {
            error: 'You have not subscribed to any plan yet.',
          };
        }

        const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
          customer: customer.stripeCustomerId,
        });

        return upcomingInvoice.lines.data.map((line) => line.description);
      },
    }),
  };
}
