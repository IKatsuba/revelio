import telegramifyMarkdown from 'telegramify-markdown';

export function telegramify(markdown: string) {
  return telegramifyMarkdown(markdown, 'remove');
}
