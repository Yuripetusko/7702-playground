import hre from 'hardhat';
import {
  deployBulkWriter,
  deployCatalogUtils,
  deployCollectionUtils,
  deployRenderUtils,
} from './utils-deploy-methods';

async function main() {
  const [deployer] = await hre.viem.getWalletClients();
  // const publicClient = await hre.viem.getPublicClient();
  console.log(`Deployer address: ${deployer.account.address}`);

  await deployBulkWriter();
  await deployCatalogUtils();
  await deployCollectionUtils();
  await deployRenderUtils();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
