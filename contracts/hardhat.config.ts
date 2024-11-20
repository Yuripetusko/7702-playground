import type { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox-viem';
import '@nomicfoundation/hardhat-foundry';
import { odysseyTestnet } from 'viem/chains';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.27',
    settings: {
      evmVersion: 'prague',
      optimizer: {
        enabled: true,
        runs: 1,
      },
    },
  },
  networks: {
    odysseyTestnet: {
      url: process.env.ITHACA_ODYSSEY_RPC_URL || 'https://odyssey.ithaca.xyz',
      chainId: odysseyTestnet.id,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
  },
  blockscout: {
    customChains: [
      {
        network: 'odysseyTestnet',
        chainId: odysseyTestnet.id,
        urls: {
          apiURL: 'https://odyssey-explorer.ithaca.xyz/api',
          browserURL: 'https://odyssey-explorer.ithaca.xyz',
        },
      },
    ],
  },
};

export default config;
