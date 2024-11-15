import type { Event } from '../model';

export interface EventFacade {
  addEvent(event: Event): void;

  pushEvents(): Promise<void>;
}
