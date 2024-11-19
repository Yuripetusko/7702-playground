import { type Hex, isAddress } from 'viem';
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
import {
  getAccountEntityId,
  getDesignatorEntityId,
} from '../utils/entity-id-helpers';
import { getTransactionHandlerContext } from '../utils/get-transaction-handler-context';

export const processSetCodeTransaction = async (
  transaction: Transaction,
  ctx: FuncContext,
  batchState: BatchState,
) => {
  if (
    transaction.to &&
    isAddress(transaction.to) &&
    !!transaction.authorizationList
  ) {
    const blockEntity = await batchState.cachedState.blocks.getOrThrow(
      transaction.block.id,
    );
    const handlerContext = getTransactionHandlerContext(
      transaction,
      ctx,
      batchState,
      blockEntity,
    );

    //TODO: Handle multiple authorizationList items
    const designatorAddress = transaction.authorizationList?.[0]?.address as
      | Hex
      | undefined;

    const accountId = getAccountEntityId(transaction.to);
    const account =
      await handlerContext.batchState.cachedState.accounts.getOrCreate(
        accountId,
        async () => new Account({ id: accountId, address: transaction.to }),
      );

    let designator: Designator | undefined;

    if (designatorAddress) {
      const designatorId = getDesignatorEntityId(designatorAddress);

      // Contract that has smart account functionality
      designator =
        await handlerContext.batchState.cachedState.designators.getOrCreate(
          designatorId,
          async () =>
            new Designator({
              id: designatorId,
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
    if (transaction.authorizationList) {
      await processSetCodeTransaction(transaction, ctx, batchState);
    }
  }
};
