import { createHumanMessage, runAgentAndReply } from '@revelio/agent';
import { BotContext, getPlansDescription, helpText } from '@revelio/bot-utils';
import { injectEnv } from '@revelio/env';
import { createToolMessages } from '@revelio/llm';

export async function help(ctx: BotContext) {
  await ctx.replyWithChatAction('typing');

  const env = injectEnv();

  ctx.prompt = [
    await createHumanMessage('/help'),
    ...createToolMessages({
      toolName: 'help',
      result: {
        system: `This is the help message to user.
You need to replace this with the actual message you want to show to the user.
Add more information about the bot and how to use it. Describe your tooling and how to use it.
Give just user plan description and how to upgrade (/billing command).`,
        helpMsg: `Current user language: ${ctx.session.language ?? ctx.from?.language_code ?? 'Unknown'}
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
