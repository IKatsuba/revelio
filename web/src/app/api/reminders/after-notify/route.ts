import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { NextRequest } from 'next/server';

import { ReminderStatus } from '@prisma/client';

import { prisma } from '@revelio/prisma/server';

export const POST = verifySignatureAppRouter(async (req: NextRequest) => {
  try {
    const { id } = JSON.parse(atob((await req.json()).sourceBody));

    await prisma.reminder.update({
      where: {
        id,
      },
      data: {
        status: ReminderStatus.CANCELLED,
      },
    });
  } catch (error) {
    console.error(error);
  }

  return Response.json({ status: 'ok' });
});
