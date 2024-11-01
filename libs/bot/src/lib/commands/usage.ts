import { BotContext, telegramify } from '@revelio/bot-utils';
import { prisma } from '@revelio/prisma/server';
import { stripe } from '@revelio/stripe/server';

export async function usage(ctx: BotContext) {
  const customer = await prisma.customer.findUnique({
    where: { id: ctx.chatId!.toString() },
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
