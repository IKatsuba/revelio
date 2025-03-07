import { CommandContext } from 'grammy';

import { createHumanMessage, runAgentAndReply } from '@revelio/agent';
import { BotContext, getPlansDescription, helpText } from '@revelio/bot-utils';
import { injectEnv } from '@revelio/env';
import { createToolMessages } from '@revelio/llm';
import { injectPrisma } from '@revelio/prisma';

export async function start(ctx: CommandContext<BotContext>) {
  const prisma = injectPrisma();
  const env = injectEnv();

  await ctx.replyWithChatAction('typing');

  if (ctx.from) {
    await prisma.user.upsert({
      where: { id: ctx.from.id.toString() },
      create: {
        id: ctx.from.id.toString(),
        username: ctx.from.username,
      },
      update: {
        username: ctx.from.username,
      },
    });

    await prisma.group.upsert({
      where: { id: ctx.chatId.toString() },
      create: {
        id: ctx.chatId.toString(),
        type: ctx.chat.type,
        plan: 'free',
      },
      update: {
        type: ctx.chat.type,
      },
    });

    await prisma.groupMember.upsert({
      where: { userId_groupId: { userId: ctx.from.id.toString(), groupId: ctx.chatId.toString() } },
      create: {
        userId: ctx.from.id.toString(),
        groupId: ctx.chatId.toString(),
        role: 'creator',
      },
      update: {
        role: 'creator',
      },
    });
  }

  ctx.prompt = [
    await createHumanMessage('/start'),
    ...createToolMessages({
      toolName: 'startMsg',
      result: {
        system: `This is the hello message to user.
You need to replace this with the actual message you want to show to the user.
Add more information about the bot and how to use it. Describe your tooling and how to use it.
Describe the plans, if it is unknown, show the user how to upgrade (/billing command).`,
        startMsg: `Current user language: ${ctx.session.language ?? ctx.from?.language_code ?? 'Unknown'}
Current plan: ${ctx.session.plan ?? 'Unknown'}
Plan description:
${getPlansDescription(env)}

Help message:
${helpText}
`,
      },
    }),
  ];

  await runAgentAndReply();
}
