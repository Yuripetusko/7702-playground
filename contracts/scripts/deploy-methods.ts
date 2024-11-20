import type { AbiParameterToPrimitiveType } from '@nomicfoundation/hardhat-viem/types';
import hre from 'hardhat';
import { type Address, maxUint256 } from 'viem';
import { verifyIfNotHardhat } from './common';
import * as CONSTANTS from './constants';
import { CATALOG_PARTS } from './constants';

export async function deployCatalog(
  catalogMetadataUri: string,
  catalogType: string,
) {
  const catalog = await hre.viem.deployContract('RMRKCatalogImpl', [
    catalogMetadataUri,
    catalogType,
  ]);
  const catalogAddress = catalog.address;
  console.log('Catalog deployed to:', catalogAddress);

  await verifyIfNotHardhat(catalogAddress, [catalogMetadataUri, catalogType]);
  return catalog;
}

type PFPDeployArgs = [
  name: AbiParameterToPrimitiveType<{ name: 'name'; type: 'string' }>,
  symbol: AbiParameterToPrimitiveType<{ name: 'symbol'; type: 'string' }>,
  collectionMetadata: AbiParameterToPrimitiveType<{
    name: 'collectionMetadata';
    type: 'string';
  }>,
  maxSupply: AbiParameterToPrimitiveType<{
    name: 'maxSupply';
    type: 'uint256';
  }>,
  royaltyRecipient: AbiParameterToPrimitiveType<{
    name: 'royaltyRecipient';
    type: 'address';
  }>,
  royaltyPercentageBps: AbiParameterToPrimitiveType<{
    name: 'royaltyPercentageBps';
    type: 'uint16';
  }>,
];

export async function deployPfp() {
  const network = hre.network.name;
  console.log(`Deploying ME to ${network} chain...`);
  const args = [
    'Odyssey PFP',
    'ODYSSEY_PFP',
    CONSTANTS.SKIN_COLLECTION_METADATA,
    maxUint256,
    CONSTANTS.BENEFICIARY as Address,
    CONSTANTS.ROYALTIES_BPS,
  ] satisfies PFPDeployArgs;

  const contract = await hre.viem.deployContract('PFP', args);

  const contractAddress = contract.address;
  console.log(`Collection deployed to ${contractAddress}`);

  await verifyIfNotHardhat(contractAddress, [...args]);
  return contract;
}

export async function configureCatalog(catalogAddress: Address) {
  const catalog = await hre.viem.getContractAt(
    'RMRKCatalogImpl',
    catalogAddress,
  );
  const publicClient = await hre.viem.getPublicClient();
  console.log('Configuring catalog...');
  const txHash = await catalog.write.addPartList([CATALOG_PARTS]);
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  const hash2 = await catalog.write.setEquippableToAll([
    CONSTANTS.SLOT_PART_BODY_ID,
  ]);
  await publicClient.waitForTransactionReceipt({ hash: hash2 });
  const hash3 = await catalog.write.setEquippableToAll([
    CONSTANTS.SLOT_PART_HEAD_ID,
  ]);
  await publicClient.waitForTransactionReceipt({ hash: hash3 });
  const hash4 = await catalog.write.setEquippableToAll([
    CONSTANTS.SLOT_PART_BACKGROUND_ID,
  ]);
  await publicClient.waitForTransactionReceipt({ hash: hash4 });
  console.log('Catalog configured');
}

export async function addMeAssets(
  collectionAddress: Address,
  catalogAddress: Address,
) {
  console.log('Adding assets to Collection...');
  const publicClient = await hre.viem.getPublicClient();
  const collection = await hre.viem.getContractAt('PFP', collectionAddress);
  for (let i = 0; i < CONSTANTS.FIXED_PART_METADATA_URIS.length; i++) {
    const txHash = await collection.write.addEquippableAssetEntry([
      0n,
      catalogAddress,
      CONSTANTS.FIXED_PART_METADATA_URIS[i],
      [
        CONSTANTS.FIXED_PART_IDS[i],
        CONSTANTS.SLOT_PART_BODY_ID,
        CONSTANTS.SLOT_PART_HEAD_ID,
        CONSTANTS.SLOT_PART_BACKGROUND_ID,
      ],
    ]);
    await publicClient.waitForTransactionReceipt({ hash: txHash });
  }
  console.log('Assets added to ME');

  let hash = await collection.write.setImgUri([1n, CONSTANTS.IMAGE_URIS[0]]);
  await publicClient.waitForTransactionReceipt({ hash: hash });

  hash = await collection.write.setImgUri([2n, CONSTANTS.IMAGE_URIS[1]]);
  await publicClient.waitForTransactionReceipt({ hash: hash });

  hash = await collection.write.setImgUri([3n, CONSTANTS.IMAGE_URIS[2]]);
  await publicClient.waitForTransactionReceipt({ hash: hash });

  console.log('Image URIs set');

  if (hre.network.config.chainId === undefined)
    throw new Error('Chain ID is not defined in network config');

  const baseAnimationURI = CONSTANTS.BASE_ANIMATION_URI_PROD.replace(
    '{contractAddress}',
    collection.address,
  ).replace('{chanId}', hre.network.config.chainId.toString());
  hash = await collection.write.setBaseAnimationURI([baseAnimationURI]);
  await publicClient.waitForTransactionReceipt({ hash: hash });
  console.log('Base animation URI set');
}
