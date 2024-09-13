import { openaiClient } from './openai';

export async function moderate(text: string) {
  return openaiClient.moderations.create({ input: text });
}
