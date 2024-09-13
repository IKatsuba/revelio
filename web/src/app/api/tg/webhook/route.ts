import { GrammyError } from 'grammy';

import { bot } from '@revelio/bot/server';

export const maxDuration = 60;

export async function GET() {
  return new Response('Ok');
}

export const POST = validateWebhook(async (request: Request) => {
  const body = await request.json();

  try {
    await bot.init();

    await bot.handleUpdate(body);
  } catch (error) {
    console.error(error);

    if (error instanceof GrammyError && error.error_code === 403) {
      return new Response('Ok');
    }

    if (process.env.NODE_ENV === 'development') {
      return new Response('Ok');
    }

    return new Response((error as Error).message, { status: 500 });
  }

  return new Response('Ok');
});

function validateWebhook(handler: (req: Request) => Promise<Response>) {
  return (req: Request) => {
    if (!process.env.BOT_WEBHOOK_SECRET) {
      return handler(req);
    } else {
      const token = req.headers.get('x-telegram-bot-api-secret-token');
      if (process.env.BOT_WEBHOOK_SECRET === token) {
        return handler(req);
      } else {
        console.log('Secret token does not match:', token, process.env.BOT_WEBHOOK_SECRET);
      }
    }

    return new Response('Unauthorized', { status: 401 });
  };
}
