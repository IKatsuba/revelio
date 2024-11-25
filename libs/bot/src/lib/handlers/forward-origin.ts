import { HumanMessage } from '@langchain/core/messages';

import { injectMessageHistory, messageTemplate } from '@revelio/agent';
import { BotContext } from '@revelio/bot-utils';

export async function forwardOrigin(ctx: BotContext) {
  if (!ctx.message?.forward_origin) {
    return;
  }

  const history = injectMessageHistory();

  const message = await messageTemplate.format(getDataByType(ctx));

  await history.addMessage(
    new HumanMessage(
      `message forwarded from another chat. Chat type: ${ctx.message.forward_origin.type}\n\n${message}`,
    ),
  );
}

function getDataByType(ctx: BotContext): {
  username: string;
  firstName: string;
  lastName: string;
  userId: string;
  messageId: string;
  messageText: string;
} {
  const msg = ctx.message!;
  const forwardOrigin = msg.forward_origin!;

  switch (forwardOrigin.type) {
    case 'user':
      return {
        username: forwardOrigin.sender_user.username ?? 'Unknown',
        firstName: forwardOrigin.sender_user.first_name,
        lastName: forwardOrigin.sender_user.last_name ?? 'Unknown',
        userId: forwardOrigin.sender_user.id.toString(),
        messageId: msg.message_id.toString(),
        messageText: msg.text ?? msg.caption ?? ctx.transcription ?? '',
      };
    case 'channel':
      return {
        username: forwardOrigin.chat.username ?? 'Unknown',
        firstName: forwardOrigin.chat.title,
        lastName: '',
        userId: forwardOrigin.chat.id.toString(),
        messageId: forwardOrigin.message_id.toString(),
        messageText: msg.text ?? msg.caption ?? ctx.transcription ?? '',
      };
    case 'chat':
      return {
        username: forwardOrigin.sender_chat.username ?? 'Unknown',
        firstName: forwardOrigin.sender_chat.title ?? 'Unknown',
        lastName: '',
        userId: forwardOrigin.sender_chat.id.toString(),
        messageId: msg.message_id.toString(),
        messageText: msg.text ?? msg.caption ?? ctx.transcription ?? '',
      };
    case 'hidden_user':
      return {
        username: forwardOrigin.sender_user_name,
        firstName: 'Unknown',
        lastName: 'Unknown',
        userId: 'Unknown',
        messageId: msg.message_id.toString(),
        messageText: msg.text ?? msg.caption ?? ctx.transcription ?? '',
      };
    default:
      return {
        username: 'Unknown',
        firstName: 'Unknown',
        lastName: 'Unknown',
        userId: 'Unknown',
        messageId: 'Unknown',
        messageText: msg.text ?? msg.caption ?? ctx.transcription ?? '',
      };
  }
}
