import { Context } from 'grammy';

export class Analytics {
  constructor(
    private cfAnalytics: AnalyticsEngineDataset,
    private ctx: Context,
  ) {}

  track(event: string) {
    this.cfAnalytics.writeDataPoint({
      indexes: [
        this.ctx.chatId.toString(), // index1
        this.ctx.from.id.toString(), // index2
      ],
      blobs: [
        this.ctx.chat.type, // blob1
        this.ctx.from.username, // blob2
        event, // blob3
      ],
    });
  }
}
