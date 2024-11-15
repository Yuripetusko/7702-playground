import type { Address } from 'viem';
import { config } from '../config';

export const getAccountEntityId = (accountAddress: Address) => {
  return `${config.CHAIN_ID}-${accountAddress}`;
};

export const getDesignatorEntityId = (contractAddress: Address) => {
  return `${config.CHAIN_ID}-${contractAddress}`;
};
