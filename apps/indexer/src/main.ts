import type { Simplify } from '@subsquid/evm-abi/lib/indexed';
import type { Chain } from '@subsquid/evm-abi/src/contract-base';
import {
  type BlockHeader,
  type DEFAULT_FIELDS,
  type DataHandlerContext,
  EvmBatchProcessor,
  type EvmBatchProcessorFields,
  type FieldSelection,
  type StateDiff,
  type Trace,
  type TransactionRequiredFields,
  type Log as _Log,
  type Transaction as _Transaction,
} from '@subsquid/evm-processor';
import type { EvmTransaction } from '@subsquid/evm-processor/lib/interfaces/evm';
// import type {
//   FieldSelection,
//   StateDiff,
//   Trace,
//   TransactionRequiredFields,
// } from '@subsquid/evm-processor/src/interfaces/data';
// import type { EvmTransaction } from '@subsquid/evm-processor/src/interfaces/evm';
import { TypeormDatabase } from '@subsquid/typeorm-store';
import { type TemporaryCache, getBatchState } from './batch-state';
import { config } from './config';
import type { DbStore } from './entity-manager';
import { runProcessor } from './processor';
import { getGlobalState } from './processorState';

const db = new TypeormDatabase();

// const archive = {
//   base: lookupArchive('base-mainnet'),
//   'base-sepolia': lookupArchive('base-sepolia'),
// };

export const processor = new EvmBatchProcessor()
  // .setGateway(archive[config.NETWORK])
  .setRpcEndpoint({
    capacity: 2,
    // set RPC endpoint in .env
    url: config.RPC_URL,
    rateLimit: config.RPC_RATE_LIMIT,
    maxBatchCallSize: config.RPC_MAX_BATCH_SIZE,
  })
  .setFinalityConfirmation(75) // 15 mins to finality
  .addTransaction({
    type: [4],

    // related data retrieval
    logs: true,
    stateDiffs: false,
    traces: false,
  })
  .setBlockRange({
    from: config.BLOCK_RANGE_FROM,
  })
  .setFields({
    log: { transactionHash: true },
    block: { size: true },
    transaction: {
      // transactionHash: true,
      to: true,
      authorizationList: true,
      from: true,
      value: true,
      hash: true,
      type: true,
      input: true,
      chainId: true,
      sighash: true,
      yParity: true,
    },
  });

export type Fields = EvmBatchProcessorFields<typeof processor>;
export type Block = BlockHeader<Fields>;
export type Log = _Log<Fields>;
export type TTransaction<F extends FieldSelection = {}> = Simplify<
  { id: string } & Pick<EvmTransaction, TransactionRequiredFields> &
    Select<EvmTransaction, GetFields<F, 'transaction'>> & {
      block: BlockHeader<F>;
      logs: _Log<F>[];
      traces: Trace<F>[];
      stateDiffs: StateDiff<F>[];
    }
>;

export type Transaction = TTransaction<Fields>;

export type ProcessorContext<Store> = DataHandlerContext<Store, Fields>;

export type BlockData<F extends FieldSelection = {}> = {
  header: BlockHeader<F>;
  transactions: TTransaction<F>[];
  logs: _Log<F>[];
  traces: Trace<F>[];
  stateDiffs: StateDiff<F>[];
};

type DefaultFields = typeof DEFAULT_FIELDS;

type TrueFields<F> = keyof {
  [K in keyof F as true extends F[K] ? K : never]: true;
};

type GetFields<
  F extends FieldSelection,
  P extends keyof DefaultFields,
> = TrueFields<F[P] & DefaultFields[P]>;

type Select<T, F> = T extends any
  ? Simplify<Pick<T, Extract<keyof T, F>>>
  : never;

processor.run<DbStore>(db as any, async (ctx) => {
  const state = await getGlobalState(ctx.store, ctx.log);
  const batchState = getBatchState(ctx.store, state);
  const blocks = ctx.blocks as BlockData<Fields>[];

  await runProcessor(blocks, ctx, batchState);
});

export async function saveAll(cache: TemporaryCache) {
  await cache.designators.saveAll();
  await cache.accounts.saveAll();

  await cache.blocks.saveAll();
  await cache.events.saveAll();
}

export async function resetAll(cache: TemporaryCache) {
  await cache.accounts.resetAll();
  await cache.designators.resetAll();

  await cache.blocks.resetAll();
  await cache.events.resetAll();
}

// @ts-ignore
export const chainClient: Chain = processor.getChain();
