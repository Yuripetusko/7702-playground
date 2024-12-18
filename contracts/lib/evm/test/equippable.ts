import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { ethers } from 'hardhat';
import {
  RMRKCatalogImpl,
  RMRKEquipRenderUtils,
  RMRKEquippableMock,
  RMRKMultiAssetRenderUtils,
} from '../typechain-types';
import shouldBehaveLikeEquippableAssets from './behavior/equippableAssets';
import shouldBehaveLikeEquippableWithParts from './behavior/equippableParts';
import shouldBehaveLikeEquippableWithSlots from './behavior/equippableSlots';
import shouldBehaveLikeMultiAsset from './behavior/multiasset';
import { setupContextForParts } from './setup/equippableParts';
import { setupContextForSlots } from './setup/equippableSlots';
import {
  GenericMintable,
  addAssetEntryEquippablesFromMock,
  addAssetToToken,
  mintFromMock,
  nestMintFromMock,
} from './utils';
// --------------- FIXTURES -----------------------

async function partsFixture() {
  const catalogSymbol = 'NCB';
  const catalogType = 'mixed';

  const catalogFactory = await ethers.getContractFactory('RMRKCatalogImpl');
  const equipFactory = await ethers.getContractFactory('RMRKEquippableMock');
  const viewFactory = await ethers.getContractFactory('RMRKEquipRenderUtils');

  // Catalog
  const catalog = <RMRKCatalogImpl>(
    await catalogFactory.deploy(catalogSymbol, catalogType)
  );
  await catalog.waitForDeployment();

  // Neon token
  const neon = <RMRKEquippableMock>await equipFactory.deploy();
  await neon.waitForDeployment();

  // Weapon
  const mask = <RMRKEquippableMock>await equipFactory.deploy();
  await mask.waitForDeployment();

  // View
  const view = <RMRKEquipRenderUtils>await viewFactory.deploy();
  await view.waitForDeployment();

  await setupContextForParts(
    catalog,
    neon,
    mask,
    mintFromMock,
    nestMintFromMock,
  );
  return { catalog, neon, mask, view };
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

async function equippableFixture() {
  const equipFactory = await ethers.getContractFactory('RMRKEquippableMock');
  const renderUtilsFactory = await ethers.getContractFactory(
    'RMRKMultiAssetRenderUtils',
  );

  const equip = <RMRKEquippableMock>await equipFactory.deploy();
  await equip.waitForDeployment();

  const renderUtils = <RMRKMultiAssetRenderUtils>(
    await renderUtilsFactory.deploy()
  );
  await renderUtils.waitForDeployment();

  return { equip, renderUtils };
}

// --------------- END FIXTURES -----------------------

// --------------- EQUIPPABLE BEHAVIOR -----------------------

describe('EquippableMock with Parts', async () => {
  beforeEach(async function () {
    const { catalog, neon, mask, view } = await loadFixture(partsFixture);

    this.catalog = catalog;
    this.neon = neon;
    this.mask = mask;
    this.view = view;
  });

  shouldBehaveLikeEquippableWithParts();
});

describe('EquippableMock with Slots', async () => {
  beforeEach(async function () {
    const { catalog, soldier, weapon, weaponGem, background, view } =
      await loadFixture(slotsFixture);

    this.catalog = catalog;
    this.soldier = soldier;
    this.weapon = weapon;
    this.weaponGem = weaponGem;
    this.background = background;
    this.view = view;
  });

  shouldBehaveLikeEquippableWithSlots(nestMintFromMock);
});

describe('EquippableMock Assets', async () => {
  beforeEach(async function () {
    const { equip, renderUtils } = await loadFixture(equippableFixture);
    this.nestable = equip;
    this.equip = equip;
    this.renderUtils = renderUtils;
  });

  shouldBehaveLikeEquippableAssets(mintFromMock);
});

// --------------- END EQUIPPABLE BEHAVIOR -----------------------

// --------------- MULTI ASSET BEHAVIOR -----------------------

describe('EquippableMock MA behavior', async () => {
  let nextTokenId = 1n;
  let equip: RMRKEquippableMock;
  let renderUtils: RMRKMultiAssetRenderUtils;

  beforeEach(async function () {
    ({ equip, renderUtils } = await loadFixture(equippableFixture));
    this.token = equip;
    this.renderUtils = renderUtils;
  });

  async function mintToNestable(
    token: GenericMintable,
    to: string,
  ): Promise<bigint> {
    const tokenId = nextTokenId;
    nextTokenId++;
    await equip.mint(to, tokenId);
    return BigInt(tokenId);
  }

  shouldBehaveLikeMultiAsset(
    mintToNestable,
    addAssetEntryEquippablesFromMock,
    addAssetToToken,
  );
});

// --------------- MULTI ASSET BEHAVIOR END ------------------------
