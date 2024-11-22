import { injectBotContext } from '@revelio/bot-utils';
import { classProvider, inject, provide } from '@revelio/di';
import { injectEnv } from '@revelio/env';

export class Analytics {
  private cfAnalytics = injectEnv().analytics;
  private ctx = injectBotContext();

  track(event: string) {
    this.cfAnalytics.writeDataPoint({
      indexes: [
        this.ctx.chatId.toString(), // index1
      ],
      blobs: [
        this.ctx.chat.type, // blob1
        this.ctx.from.id.toString(), // blob2
        this.ctx.from.username, // blob3
        event, // blob4
      ],
    });
  }
}

export function injectAnalytics() {
  return inject(Analytics);
}

export function provideAnalytics() {
  provide(Analytics, classProvider(Analytics));
}
