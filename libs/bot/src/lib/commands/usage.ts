import { prisma } from '@revelio/prisma/server';
import { stripe } from '@revelio/stripe/server';

import { BotContext } from '../context';
import { telegramify } from '../telegramify';

export async function usage(ctx: BotContext) {
  const customer = await prisma.customer.findUnique({
    where: { id: ctx.from!.id },
  });

  if (!customer) {
    return ctx.reply('You have not subscribed to any plan yet.');
  }

  const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
    customer: customer.stripeCustomerId,
  });

  const messages = upcomingInvoice.lines.data.map((line) => {
    return line.description;
  });

  console.log(upcomingInvoice.lines);

  return ctx.reply(
    telegramify(`Your usage for the upcoming billing period:

- ${messages.join('\n- ')}

**Total**: $${upcomingInvoice.total / 100}
      `),

    {
      parse_mode: 'MarkdownV2',
    },
  );
}
