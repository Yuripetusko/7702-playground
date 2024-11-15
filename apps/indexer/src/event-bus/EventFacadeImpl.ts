import type { EventFacade } from './EventFacade';
import type { TemporaryCache } from '../batch-state';
import type { Logger } from '@subsquid/logger';
import type { DbStore } from '../entity-manager';
import type {
  Event,
} from '../model';
import type { EventService } from '../events/EventService';

type Block = {
  timestamp: Date;
  number: number;
};

export class RedisEventFacadeImpl implements EventFacade {
  constructor(
    private bus: EventService,
    private cache: TemporaryCache,
    private logger: Logger,
    private store: DbStore,
  ) {}

  public addEvent(event: Event) {
    this.cache.events.add(event);
  }



  public async pushEvents(): Promise<void> {

  }
}
