import { CommandContext } from 'grammy';

import { BotContext, helpText, plansDescription } from '@revelio/bot-utils';
import { createToolMessages, generateAnswer } from '@revelio/llm';

export async function start(ctx: CommandContext<BotContext>) {
  await ctx.replyWithChatAction('typing');

  if (ctx.from) {
    await ctx.sql`
      INSERT INTO "User" ("id", "username", "updatedAt")
      VALUES (${ctx.from.id.toString()}, ${ctx.from.username}, NOW())
      ON CONFLICT ("id")
        DO UPDATE SET "username"  = ${ctx.from.username},
                      "updatedAt" = NOW()
    `;

    await ctx.sql`
      INSERT INTO "Group" ("id", "type", "updatedAt")
      VALUES (${ctx.chatId.toString()}, ${ctx.chat.type}, NOW())
      ON CONFLICT ("id")
        DO UPDATE SET "type"      = ${ctx.chat.type},
                      "updatedAt" = NOW()
    `;

    await ctx.sql`
      INSERT INTO "GroupMember" ("userId", "groupId", "role")
      VALUES (${ctx.from.id.toString()}, ${ctx.chatId.toString()}, 'creator')
      ON CONFLICT ("userId", "groupId")
        DO UPDATE SET "role" = 'creator'
    `;
  }

  await generateAnswer(ctx, {
    messages: [
      {
        role: 'user',
        content: '/start',
      },
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
${plansDescription}

Help message:
${helpText}
`,
        },
      }),
    ],
  });
}
