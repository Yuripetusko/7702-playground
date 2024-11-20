import hre from 'hardhat';
import { verifyIfNotHardhat } from './common';

export async function deployBulkWriter() {
  const bulkWriter = await hre.viem.deployContract('RMRKBulkWriter');
  const bulkWriterAddress = bulkWriter.address;
  console.log('Bulk Writer deployed to:', bulkWriterAddress);

  await verifyIfNotHardhat(bulkWriterAddress);
  return bulkWriter;
}

export async function deployCatalogUtils() {
  const catalogUtils = await hre.viem.deployContract('RMRKCatalogUtils');

  const catalogUtilsAddress = catalogUtils.address;
  console.log('Catalog Utils deployed to:', catalogUtilsAddress);

  await verifyIfNotHardhat(catalogUtilsAddress);
  return catalogUtils;
}

export async function deployCollectionUtils() {
  const collectionUtils = await hre.viem.deployContract('RMRKCollectionUtils');
  const collectionUtilsAddress = collectionUtils.address;
  console.log('Collection Utils deployed to:', collectionUtilsAddress);

  await verifyIfNotHardhat(collectionUtilsAddress);
  return collectionUtils;
}

export async function deployRenderUtils() {
  const renderUtils = await hre.viem.deployContract('RMRKEquipRenderUtils');
  const renderUtilsAddress = renderUtils.address;
  console.log('Equip Render Utils deployed to:', renderUtilsAddress);

  await verifyIfNotHardhat(renderUtilsAddress);
  return renderUtils;
}
