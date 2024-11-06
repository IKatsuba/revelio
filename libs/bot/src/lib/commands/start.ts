import { CommandContext } from 'grammy';
import { nanoid } from 'nanoid';

import { BotContext, helpText, plansDescription } from '@revelio/bot-utils';
import { generateAnswer } from '@revelio/llm/server';
import { prisma } from '@revelio/prisma/server';

export async function start(ctx: CommandContext<BotContext>) {
  await ctx.replyWithChatAction('typing');

  if (ctx.from) {
    await prisma.user.upsert({
      where: { id: ctx.from.id.toString() },
      update: {
        username: ctx.from.username,
      },
      create: {
        id: ctx.from.id.toString(),
        username: ctx.from.username,
      },
    });

    await prisma.group.upsert({
      where: { id: ctx.chatId.toString() },
      update: {},
      create: {
        id: ctx.chatId.toString(),
        type: ctx.chat.type,
      },
    });

    await prisma.groupMember.upsert({
      where: { userId_groupId: { userId: ctx.from.id.toString(), groupId: ctx.chatId.toString() } },
      update: {},
      create: {
        userId: ctx.from.id.toString(),
        groupId: ctx.chatId.toString(),
        role: 'creator',
      },
    });
  }

  const toolCallId = `tool_${nanoid()}`;

  await generateAnswer(ctx, {
    messages: [
      {
        role: 'user',
        content: '/start',
      },
      {
        role: 'assistant',
        content: [
          {
            type: 'tool-call',
            toolCallId,
            toolName: 'startMsg',
            args: {},
          },
        ],
      },
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId,
            toolName: 'startMsg',
            result: {
              system: `This is the hello message to user.
You need to replace this with the actual message you want to show to the user.
Add more information about the bot and how to use it. Describe your tooling and how to use it.
Describe the plans, if it is unknown, show the user how to upgrade (/billing command).`,
              startMsg: `Current user language: ${ctx.session.language ?? ctx.from?.language_code ?? 'Unknown'}
Current plan: ${ctx.session.plan ?? 'Unknown'}
Plan description:
${plansDescription}

Help message:
${helpText}
`,
            },
          },
        ],
      },
    ],
  });
}
