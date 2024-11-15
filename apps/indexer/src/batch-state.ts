import { type DbStore, EntitiesManager } from './entity-manager';
import {
  Account,
  Designator,
  Block,
  Event,
} from './model';
import type { EventFacade } from './event-bus/EventFacade';
import { RedisEventFacadeImpl } from './event-bus/EventFacadeImpl';
import { logger } from './processor';
import type { GlobalState } from './processorState';

export type TemporaryCache = {
  designators: EntitiesManager<Designator>;
  accounts: EntitiesManager<Account>;
  blocks: EntitiesManager<Block>;
  events: EntitiesManager<Event>;
};

export function getBatchState(store: DbStore, state: GlobalState): BatchState {
  const cachedState: TemporaryCache = {
    designators: new EntitiesManager(Designator, store),
    accounts: new EntitiesManager(Account, store),
    blocks: new EntitiesManager(Block, store),
    events: new EntitiesManager(Event, store),
  };

  return {
    cachedState,
    eventFacade: new RedisEventFacadeImpl(state.eventService, cachedState, logger, store),
  };
}

export type BatchState = {
  cachedState: TemporaryCache;
  eventFacade: EventFacade;
};
