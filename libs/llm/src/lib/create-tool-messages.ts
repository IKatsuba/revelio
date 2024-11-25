import { AIMessage, ToolMessage } from '@langchain/core/messages';
import { nanoid } from 'nanoid';

export function createToolMessages({
  toolName,
  args = {},
  result = {},
}: {
  toolName: string;
  result: Record<string, unknown>;
  args?: Record<string, unknown>;
}): [AIMessage, ToolMessage] {
  const toolCallId = `tool_${nanoid()}`;

  return [
    new AIMessage({
      content: '',
      additional_kwargs: {
        tool_calls: [
          {
            id: toolCallId,
            type: 'function',
            function: {
              name: toolName,
              arguments: JSON.stringify(args),
            },
          },
        ],
      },
    }),
    new ToolMessage({
      tool_call_id: toolCallId,
      name: toolName,
      content: JSON.stringify(result),
    }),
  ];
}
