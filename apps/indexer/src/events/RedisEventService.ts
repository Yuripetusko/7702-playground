import type { EventService } from './EventService';

export class RedisEventService implements EventService {
  // constructor() {}

  async emitEvent(): Promise<void> {
    // await this.queue.add(e.name, e.payload);
  }

  async emitEvents(): Promise<void> {
    // await this.queue.addBulk(events.map((e) => ({ name: e.name, data: e.payload })));
  }
}
