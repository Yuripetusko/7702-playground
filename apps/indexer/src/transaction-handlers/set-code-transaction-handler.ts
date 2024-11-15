import { http, createPublicClient, isAddress } from 'viem';
import { odysseyTestnet } from 'viem/chains';
import type { BatchState } from '../batch-state';
import type { Transaction } from '../main';
import {
  Account,
  Designator,
  Event,
  EventType,
  SetCodeTxTypePayload,
} from '../model';
import type { FuncContext } from '../processor';
import { getTransactionHandlerContext } from '../utils/get-transaction-handler-context';

const publicClient = createPublicClient({
  chain: odysseyTestnet,
  transport: http(),
});

export const processSetCodeTransaction = async (
  transaction: Transaction,
  ctx: FuncContext,
  batchState: BatchState,
) => {
  if (transaction.to && isAddress(transaction.to)) {
    const blockEntity = await batchState.cachedState.blocks.getOrThrow(
      transaction.block.id,
    );
    const handlerContext = getTransactionHandlerContext(
      transaction,
      ctx,
      batchState,
      blockEntity,
    );
    //TODO: When sqd sdk adds `authorizationList` to the transaction, then we probably can decode it to get the contract instead of making another call
    const bytecode = await publicClient.getCode({
      address: transaction.to,
      blockNumber: BigInt(transaction.block.height),
    });

    const accountId = transaction.to;
    const account =
      await handlerContext.batchState.cachedState.accounts.getOrCreate(
        accountId,
        async () => new Account({ id: accountId }),
      );

    let designator: Designator | undefined;

    // Prefix 0xef0100 indicates that the Account was upgraded to smart account and it's bytecode points to a contract code
    if (bytecode?.startsWith('0xef0100')) {
      const designatorAddress = bytecode.replace('0xef0100', '0x');

      // Contract that has smart account functionality
      designator =
        await handlerContext.batchState.cachedState.designators.getOrCreate(
          designatorAddress,
          async () =>
            new Designator({
              id: designatorAddress,
              address: designatorAddress,
            }),
        );

      account.designator = designator;
    } else {
      account.designator = null;
    }

    // Save event when designator was set.
    // TODO: perhaps have a separate event when the bytecode was reset to empty
    handlerContext.eventFacade.addEvent(
      new Event({
        eventType: EventType.SetCodeTxType,
        designator,
        account,
        payload: new SetCodeTxTypePayload({
          from: transaction.from,
          designatorAddress: designator?.address ?? '',
        }),
      }),
    );
  }
};

export const processSetCodeTransactions = async (
  transactions: Transaction[],
  ctx: FuncContext,
  batchState: BatchState,
) => {
  for (const transaction of transactions) {
    await processSetCodeTransaction(transaction, ctx, batchState);
  }
};
