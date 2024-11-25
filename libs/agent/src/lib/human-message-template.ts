import { HumanMessagePromptTemplate } from '@langchain/core/prompts';

import { injectBotContext } from '@revelio/bot-utils';

const humanMessageTemplate = HumanMessagePromptTemplate.fromTemplate(`# User info
Username: {username}
First name: {firstName}
Second name: {lastName}
User id: {userId}
Message id: {messageId}
---
Message text from user: {messageText}`);

export function createHumanMessage(
  text: string,
  {
    additionalInfo,
  }: {
    additionalInfo?: string;
  } = {},
) {
  const ctx = injectBotContext();

  return humanMessageTemplate.format({
    username: ctx.from?.username ?? 'Unknown',
    firstName: ctx.from?.first_name ?? 'Unknown',
    lastName: ctx.from?.last_name ?? 'Unknown',
    userId: ctx.from?.id ?? 'Unknown',
    messageId: ctx.message?.message_id ?? 'Unknown',
    additionalInfo: additionalInfo ?? '',
    messageText: text,
  });
}
