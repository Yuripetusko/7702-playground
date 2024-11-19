import type { AbiEvent } from '@subsquid/evm-abi';
import type { Codec } from '@subsquid/evm-codec';
// import type { BlockData } from '@subsquid/evm-processor';
import { type Logger as SquidLogger, createLogger } from '@subsquid/logger';
import { isAddress } from 'viem';
import type { BatchState } from './batch-state';
import { config } from './config';
import type { DbStore } from './entity-manager';
// import { processNftLogs } from './log-handlers/nfts/nft-handlers';
import type { EventFacade } from './event-bus/EventFacade';
import {
  type BlockData,
  // type BlockData,
  type Fields,
  type Log,
  resetAll,
  saveAll,
} from './main';
import { Block } from './model';
import { processSetCodeTransactions } from './transaction-handlers/set-code-transaction-handler';

type EventArgs = {
  [key: string]: Codec<any> & { indexed?: boolean };
};

export type Logger = SquidLogger;
export const logger: Logger = createLogger('sqd:processor');

export type FuncContext = {
  log: Logger;
  store: DbStore;
};

export type HandlerContext = {
  ctx: FuncContext;
  dbBlock: Block;
  batchState: BatchState;
  eventFacade: Pick<EventFacade, 'addEvent'>;
};

export type Handler = (event: Log, handlerCtx: HandlerContext) => Promise<any>;

export function generateHandlerFromProcessor<
  E extends EventArgs,
  T extends { [key: string]: AbiEvent<E> },
  K extends keyof T,
>(
  event: T[K],
  processor: (
    decoded: ReturnType<typeof event.decode>,
    item: Log,
    ctx: HandlerContext,
  ) => Promise<any>,
): [string, Handler] {
  return [
    event.topic,
    (item, ctx): Promise<void> => processor(event.decode(item), item, ctx),
  ];
}

export type Processor<T> = (
  decodedEvent: T,
  originalEvent: Log,
  handlerCtx: HandlerContext,
) => Promise<unknown>;

export function createDbBlock(block: BlockData<Fields>) {
  return new Block({
    id: `${block.header.id}`,
    timestamp: new Date(block.header.timestamp),
    number: block.header.height,
  });
}

export const runProcessor = async (
  blocks: BlockData<Fields>[],
  ctx: FuncContext,
  batchState: BatchState,
) => {
  for (const block of blocks) {
    const blockEntity = createDbBlock(block);
    batchState.cachedState.blocks.add(blockEntity);
  }

  const filteredTransactions = blocks.flatMap((b) =>
    b.transactions.filter(
      (transaction) =>
        transaction.to &&
        isAddress(transaction.to) &&
        !!transaction.authorizationList &&
        transaction.authorizationList.length > 0,
    ),
  );
  await processSetCodeTransactions(filteredTransactions, ctx, batchState);

  await saveAll(batchState.cachedState);
  await batchState.eventFacade.pushEvents();
  await resetAll(batchState.cachedState);
};

// export const getLogHandlerContext = (
//   log: Log,
//   ctx: FuncContext,
//   batchState: BatchState,
//   blockEntity: Block,
// ) => {
//   const handlerContext: HandlerContext = {
//     dbBlock: blockEntity,
//     ctx,
//     batchState,
//     eventFacade: {
//       addEvent(event: Event) {
//         event.id = log.id;
//         event.block = blockEntity;
//         event.transactionHash = log.transaction.hash;
//         event.from = log.transaction.from;
//
//         batchState.eventFacade.addEvent(event);
//       },
//     },
//   };
//
//   return handlerContext;
// };
