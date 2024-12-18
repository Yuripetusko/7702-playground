import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  RMRKCatalogImpl,
  RMRKCatalogUtils,
  RMRKEquipRenderUtils,
  RMRKEquippableMock,
} from '../typechain-types';
import { setupContextForSlots } from './setup/equippableSlots';
import {
  backgroundAssetId,
  backgroundsIds,
  partIdForBackground,
  partIdForBody,
  partIdForWeapon,
  soldierResId,
  soldiersIds,
  weaponAssetsEquip,
  weaponsIds,
} from './setup/equippableSlots';
import { ADDRESS_ZERO, bn, mintFromMock, nestMintFromMock } from './utils';

const CATALOG_METADATA = 'ipfs://catalog-meta';
const CATALOG_TYPE = 'image/png';

async function catalogUtilsFixture() {
  const catalogFactory = await ethers.getContractFactory('RMRKCatalogImpl');
  const catalogUtilsFactory =
    await ethers.getContractFactory('RMRKCatalogUtils');

  const catalog = <RMRKCatalogImpl>(
    await catalogFactory.deploy(CATALOG_METADATA, CATALOG_TYPE)
  );
  await catalog.waitForDeployment();

  const catalogUtils = <RMRKCatalogUtils>await catalogUtilsFactory.deploy();

  return {
    catalog,
    catalogUtils,
  };
}

async function slotsFixture() {
  const catalogSymbol = 'SSB';
  const catalogType = 'mixed';

  const catalogFactory = await ethers.getContractFactory('RMRKCatalogImpl');
  const equipFactory = await ethers.getContractFactory('RMRKEquippableMock');
  const viewFactory = await ethers.getContractFactory('RMRKEquipRenderUtils');

  // View
  const view = <RMRKEquipRenderUtils>await viewFactory.deploy();
  await view.waitForDeployment();

  // catalog
  const catalog = <RMRKCatalogImpl>(
    await catalogFactory.deploy(catalogSymbol, catalogType)
  );
  await catalog.waitForDeployment();
  const catalogForWeapon = <RMRKCatalogImpl>(
    await catalogFactory.deploy(catalogSymbol, catalogType)
  );
  await catalogForWeapon.waitForDeployment();

  // Soldier token
  const soldier = <RMRKEquippableMock>await equipFactory.deploy();
  await soldier.waitForDeployment();

  // Weapon
  const weapon = <RMRKEquippableMock>await equipFactory.deploy();
  await weapon.waitForDeployment();

  // Weapon Gem
  const weaponGem = <RMRKEquippableMock>await equipFactory.deploy();
  await weaponGem.waitForDeployment();

  // Background
  const background = <RMRKEquippableMock>await equipFactory.deploy();
  await background.waitForDeployment();

  await setupContextForSlots(
    catalog,
    catalogForWeapon,
    soldier,
    weapon,
    weaponGem,
    background,
    mintFromMock,
    nestMintFromMock,
  );

  return { catalog, soldier, weapon, weaponGem, background, view };
}

describe('Collection Utils', () => {
  let deployer: SignerWithAddress;
  let addrs: SignerWithAddress[];
  let catalog: RMRKCatalogImpl;
  let catalogUtils: RMRKCatalogUtils;

  const partId = 1;
  const partId2 = 2;
  const partId3 = 3;
  const slotType = 1;
  const fixedType = 2;

  const partData1 = {
    itemType: slotType,
    z: 0,
    equippable: [],
    metadataURI: 'src1',
  };
  const partData2 = {
    itemType: slotType,
    z: 2,
    equippable: [],
    metadataURI: 'src2',
  };
  const partData3 = {
    itemType: fixedType,
    z: 1,
    equippable: [],
    metadataURI: 'src3',
  };

  beforeEach(async () => {
    ({ catalog, catalogUtils } = await loadFixture(catalogUtilsFixture));

    [deployer, ...addrs] = await ethers.getSigners();
    await catalog.addPartList([
      { partId: partId, part: partData1 },
      { partId: partId2, part: partData2 },
      { partId: partId3, part: partData3 },
    ]);
    await catalog.setEquippableToAll(partId);
    await catalog.addEquippableAddresses(partId2, [
      addrs[0].address,
      addrs[1].address,
    ]);
  });

  it('can get catalog data', async () => {
    expect(
      await catalogUtils.getCatalogData(await catalog.getAddress()),
    ).to.eql([deployer.address, CATALOG_TYPE, CATALOG_METADATA]);
  });

  it('can get catalog data if the catalog is not ownable', async () => {
    const catalogFactory = await ethers.getContractFactory('RMRKCatalog');
    const notOwnableCatalog = await catalogFactory.deploy(
      CATALOG_METADATA,
      CATALOG_TYPE,
    );
    expect(
      await catalogUtils.getCatalogData(await notOwnableCatalog.getAddress()),
    ).to.eql([ADDRESS_ZERO, CATALOG_TYPE, CATALOG_METADATA]);
  });

  it('can get parts data', async () => {
    expect(
      await catalogUtils.getExtendedParts(await catalog.getAddress(), [
        partId,
        partId2,
        partId3,
      ]),
    ).to.eql([
      [
        bn(partId), // partId
        bn(partData1.itemType), // itemType
        bn(partData1.z), // z
        partData1.equippable, // equippable
        true, // equippableToAll (set on beforeEach)
        partData1.metadataURI, // metadataURI
      ],
      [
        bn(partId2), // partId
        bn(partData2.itemType), // itemType
        bn(partData2.z), // z
        [addrs[0].address, addrs[1].address], // equippable (set on beforeEach)
        false, // equippableToAll
        partData2.metadataURI, // metadataURI
      ],
      [
        bn(partId3), // partId
        bn(partData3.itemType), // itemType
        bn(partData3.z), // z
        partData3.equippable, // equippable
        false, // equippableToAll (set on beforeEach)
        partData3.metadataURI, // metadataURI
      ],
    ]);
  });

  it('can get catalog and parts data', async () => {
    expect(
      await catalogUtils.getCatalogDataAndExtendedParts(
        await catalog.getAddress(),
        [partId],
      ),
    ).to.eql([
      deployer.address,
      CATALOG_TYPE,
      CATALOG_METADATA,
      [
        [
          bn(partId), // partId
          bn(partData1.itemType), // itemType
          bn(partData1.z), // z
          partData1.equippable, // equippable
          true, // equippableToAll (set on beforeEach)
          partData1.metadataURI, // metadataURI
        ],
      ],
    ]);
  });
});

describe('Collection Utils For Orphans', () => {
  let catalog: RMRKCatalogImpl;
  let soldier: RMRKEquippableMock;
  let weapon: RMRKEquippableMock;
  let background: RMRKEquippableMock;
  let catalogUtils: RMRKCatalogUtils;

  let addrs: SignerWithAddress[];

  let soldierID: bigint;
  let soldierOwner: SignerWithAddress;
  const weaponChildIndex = 0;
  const backgroundChildIndex = 1;
  const weaponResId = weaponAssetsEquip[0]; // This asset is assigned to weapon first weapon

  beforeEach(async () => {
    [, ...addrs] = await ethers.getSigners();

    ({ catalogUtils } = await loadFixture(catalogUtilsFixture));
    ({ catalog, soldier, weapon, background } =
      await loadFixture(slotsFixture));

    soldierID = soldiersIds[0];
    soldierOwner = addrs[0];

    await soldier.connect(soldierOwner).equip({
      tokenId: soldierID,
      childIndex: weaponChildIndex,
      assetId: soldierResId,
      slotPartId: partIdForWeapon,
      childAssetId: weaponResId,
    });
    await soldier.connect(soldierOwner).equip({
      tokenId: soldierID,
      childIndex: backgroundChildIndex,
      assetId: soldierResId,
      slotPartId: partIdForBackground,
      childAssetId: backgroundAssetId,
    });
  });

  it('can replace parent equipped asset and detect it as orphan', async () => {
    // Weapon is child on index 0, background on index 1
    const newSoldierResId = soldierResId + 1;
    await soldier.addEquippableAssetEntry(
      newSoldierResId,
      0,
      await catalog.getAddress(),
      'ipfs:soldier/',
      [partIdForBody, partIdForWeapon, partIdForBackground],
    );
    await soldier.addAssetToToken(soldierID, newSoldierResId, soldierResId);
    await soldier
      .connect(soldierOwner)
      .acceptAsset(soldierID, 0, newSoldierResId);

    // Children still marked as equipped, so the cannot be transferred
    expect(
      await soldier.isChildEquipped(
        soldierID,
        await weapon.getAddress(),
        weaponsIds[0],
      ),
    ).to.eql(true);
    expect(
      await soldier.isChildEquipped(
        soldierID,
        await background.getAddress(),
        backgroundsIds[0],
      ),
    ).to.eql(true);

    const equipments = await catalogUtils.getOrphanEquipmentsFromParentAsset(
      await soldier.getAddress(),
      soldierID,
      await catalog.getAddress(),
      [partIdForBody, partIdForWeapon, partIdForBackground],
    );

    expect(equipments).to.eql([
      [
        bn(soldierResId),
        bn(partIdForWeapon),
        await weapon.getAddress(),
        weaponsIds[0],
        bn(weaponAssetsEquip[0]),
      ],
      [
        bn(soldierResId),
        bn(partIdForBackground),
        await background.getAddress(),
        backgroundsIds[0],
        bn(backgroundAssetId),
      ],
    ]);
  });

  it('can replace child equipped asset and still unequip it', async () => {
    // Weapon is child on index 0, background on index 1
    const newWeaponAssetId = weaponAssetsEquip[0] + 10;
    const weaponId = weaponsIds[0];
    await weapon.addEquippableAssetEntry(
      newWeaponAssetId,
      1, // equippableGroupId
      await catalog.getAddress(),
      'ipfs:weapon/new',
      [],
    );
    await weapon.addAssetToToken(
      weaponId,
      newWeaponAssetId,
      weaponAssetsEquip[0],
    );
    await weapon
      .connect(soldierOwner)
      .acceptAsset(weaponId, 0, newWeaponAssetId);

    // Children still marked as equipped, so it cannot be transferred or equip something else into the slot
    expect(
      await soldier.isChildEquipped(
        soldierID,
        await weapon.getAddress(),
        weaponsIds[0],
      ),
    ).to.eql(true);

    expect(
      await catalogUtils.getOrphanEquipmentsFromChildAsset(
        await soldier.getAddress(),
        soldierID,
      ),
    ).to.eql([
      [
        bn(soldierResId),
        bn(partIdForWeapon),
        await weapon.getAddress(),
        weaponsIds[0],
        bn(weaponAssetsEquip[0]),
      ],
    ]);
  });
});
