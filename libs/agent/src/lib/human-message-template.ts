import { HumanMessage } from '@langchain/core/messages';
import { PromptTemplate } from '@langchain/core/prompts';

import { injectBotContext } from '@revelio/bot-utils';

export const messageTemplate = PromptTemplate.fromTemplate(`# User info
Username: {username}
First name: {firstName}
Second name: {lastName}
User id: {userId}
Message id: {messageId}
---
Message text from user: {messageText}`);

export async function createHumanMessage(text: string) {
  const ctx = injectBotContext();

  return new HumanMessage(
    await messageTemplate.format({
      username: ctx.from?.username ?? 'Unknown',
      firstName: ctx.from?.first_name ?? 'Unknown',
      lastName: ctx.from?.last_name ?? 'Unknown',
      userId: ctx.from?.id ?? 'Unknown',
      messageId: ctx.message?.message_id ?? 'Unknown',
      messageText: text,
    }),
  );
}
