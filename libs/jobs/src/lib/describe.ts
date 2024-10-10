import { task } from '@trigger.dev/sdk/v3';

import { bot, sendLongText } from '@revelio/bot-utils';
import { env } from '@revelio/env/server';
import { generateText } from '@revelio/llm/server';
import { addTokenUsage } from '@revelio/stripe/server';

export const describeTask = task({
  id: 'describe',
  async run(payload: { chatId: number; caption?: string; fileId: string }) {
    const fileData = await bot.api.getFile(payload.fileId);

    const response = await generateText([
      {
        role: 'user',
        content: [
          { type: 'text', text: payload.caption ?? 'What’s in this image?' },
          {
            type: 'image',
            image: new URL(
              `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${fileData.file_path}`,
            ),
          },
        ],
      },
    ]);

    await sendLongText(payload.chatId, response.text);

    await addTokenUsage(payload.chatId, {
      model: 'gpt-4o-mini',
      mode: 'output',
      tokenCount: response.steps.reduce((sum, step) => sum + step.usage.completionTokens, 0),
    });

    await addTokenUsage(payload.chatId, {
      model: 'gpt-4o-mini',
      mode: 'input',
      tokenCount: response.steps.reduce((sum, step) => sum + step.usage.promptTokens, 0),
    });
  },
});

export type DescribeTask = typeof describeTask;
