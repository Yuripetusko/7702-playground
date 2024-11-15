// import { Queue } from 'bullmq';
// import NotificationsManager from '../services/NotificationsManager';
import type { Logger } from './processor';
import type { DbStore } from './entity-manager';
// import { RedisEventService } from './events/RedisEventService';
import type { EventService } from './events/EventService';

function getEventService(logger: Logger, ): EventService {
  // mock service
  return {
    emitEvent(): Promise<void> {
      return Promise.resolve();
    },
    emitEvents(): Promise<void> {
      return Promise.resolve();
    },
  }
}

let globalState: GlobalState | undefined;

export async function getGlobalState(store: DbStore, logger: Logger): Promise<GlobalState> {
  if (!globalState) {

    globalState = {
      eventService: getEventService(logger),
    };
  }

  return globalState;
}

export type GlobalState = {
  eventService: EventService;
};
