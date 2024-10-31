import { tool } from 'ai';
import { z } from 'zod';

import { prisma } from '@revelio/prisma/server';
import { stripe } from '@revelio/stripe/server';

export function getCurrentBillingPlanToolFactory({ chatId }: { chatId: number }) {
  return {
    getCurrentBillingPlan: tool({
      description: 'get the current billing plan of the user.',
      parameters: z.object({}),
      execute: async () => {
        const customer = await prisma.customer.findUnique({
          where: { id: chatId.toString() },
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
