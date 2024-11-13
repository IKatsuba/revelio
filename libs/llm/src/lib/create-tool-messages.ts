import { CoreMessage } from 'ai';
import { nanoid } from 'nanoid';

export function createToolMessages({
  toolName,
  args,
  result,
}: {
  toolName: string;
  result: Record<string, unknown>;
  args?: Record<string, unknown>;
}): CoreMessage[] {
  const toolCallId = `tool_${nanoid()}`;

  return [
    {
      role: 'assistant',
      content: [
        {
          type: 'tool-call',
          toolCallId,
          toolName,
          args: args ?? {},
        },
      ],
    },
    {
      role: 'tool',
      content: [
        {
          type: 'tool-result',
          toolCallId,
          toolName,
          result,
        },
      ],
    },
  ];
}
