import type { BatchState } from '../batch-state';
import type { Transaction } from '../main';
import type { Block, Event } from '../model';
import type { FuncContext, HandlerContext } from '../processor';

export const getTransactionHandlerContext = (
  transaction: Transaction,
  ctx: FuncContext,
  batchState: BatchState,
  blockEntity: Block,
) => {
  const handlerContext: HandlerContext = {
    dbBlock: blockEntity,
    ctx,
    batchState,
    eventFacade: {
      addEvent(event: Event) {
        event.id = transaction.id;
        event.block = blockEntity;
        event.transactionHash = transaction.hash;
        event.from = transaction.from;

        batchState.eventFacade.addEvent(event);
      },
    },
  };

  return handlerContext;
};
