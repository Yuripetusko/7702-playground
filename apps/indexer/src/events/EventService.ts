export interface EventService {
  emitEvent(): Promise<void>;
  emitEvents(): Promise<void>;
}
