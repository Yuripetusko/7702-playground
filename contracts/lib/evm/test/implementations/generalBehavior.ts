import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { Contract } from 'ethers';
import { ethers } from 'hardhat';
import {
  ERC20Mock,
  RMRKAbstractEquippable,
  RMRKEquippableLazyMintErc20,
  RMRKEquippableLazyMintErc20Soulbound,
  RMRKEquippableLazyMintNative,
  RMRKEquippableLazyMintNativeSoulbound,
  RMRKEquippablePreMint,
  RMRKEquippablePreMintSoulbound,
  RMRKImplementationBase,
  RMRKMultiAssetLazyMintErc20,
  RMRKMultiAssetLazyMintErc20Soulbound,
  RMRKMultiAssetLazyMintNative,
  RMRKMultiAssetLazyMintNativeSoulbound,
  RMRKMultiAssetPreMint,
  RMRKMultiAssetPreMintSoulbound,
  RMRKNestableLazyMintErc20,
  RMRKNestableLazyMintErc20Soulbound,
  RMRKNestableLazyMintNative,
  RMRKNestableLazyMintNativeSoulbound,
  RMRKNestableMultiAssetLazyMintErc20,
  RMRKNestableMultiAssetLazyMintErc20Soulbound,
  RMRKNestableMultiAssetLazyMintNative,
  RMRKNestableMultiAssetLazyMintNativeSoulbound,
  RMRKNestableMultiAssetPreMint,
  RMRKNestableMultiAssetPreMintSoulbound,
  RMRKNestablePreMint,
  RMRKNestablePreMintSoulbound,
} from '../../typechain-types';
import {
  IERC165,
  IERC721,
  IERC721Metadata,
  IERC2981,
  IERC5773,
  IERC6220,
  IERC6454,
  IERC7401,
  IRMRKImplementation,
} from '../interfaces';
import {
  GenericAbstractImplementation,
  GenericEquippable,
  GenericMintable,
  GenericMintableERC20Pay,
  GenericMintableNativeToken,
  GenericMintablePreMint,
  GenericMultiAsset,
  GenericNestMintable,
  GenericReadyToUse,
} from '../utils';

export enum LegoCombination {
  None = 0,
  MultiAsset = 1,
  Nestable = 2,
  NestableMultiAsset = 3,
  Equippable = 4,
  ERC721 = 5,
  ERC1155 = 6,
}

export enum MintingType {
  None = 0,
  RMRKPreMint = 1,
  RMRKLazyMintNativeToken = 2,
  RMRKLazyMintERC20 = 3,
  Custom = 4,
}

const pricePerMint = ethers.parseEther('0.1');

describe('RMRKImplementations', async () => {
  const name = 'RmrkTest';
  const symbol = 'RMRKTST';
  const maxSupply = 10000;
  const collectionMetadataUri = 'ipfs://collection-meta';
  const baseTokenURI = 'ipfs://tokenURI/';

  let multiAssetPreMintImpl: RMRKMultiAssetPreMint;
  let multiAssetPreMintSoulboundImpl: RMRKMultiAssetPreMintSoulbound;
  let nestablePreMintImpl: RMRKNestablePreMint;
  let nestablePreMintSoulboundImpl: RMRKNestablePreMintSoulbound;
  let nestableMultiAssetPreMintImpl: RMRKNestableMultiAssetPreMint;
  let nestableMultiAssetPreMintSoulboundImpl: RMRKNestableMultiAssetPreMintSoulbound;
  let equippablePreMintImpl: RMRKEquippablePreMint;
  let equippablePreMintSoulboundImpl: RMRKEquippablePreMintSoulbound;
  let multiAssetLazyMintNativeImpl: RMRKMultiAssetLazyMintNative;
  let multiAssetLazyMintNativeSoulboundImpl: RMRKMultiAssetLazyMintNativeSoulbound;
  let nestableLazyMintNativeImpl: RMRKNestableLazyMintNative;
  let nestableLazyMintNativeSoulboundImpl: RMRKNestableLazyMintNativeSoulbound;
  let nestableMultiAssetLazyMintNativeImpl: RMRKNestableMultiAssetLazyMintNative;
  let nestableMultiAssetLazyMintNativeSoulboundImpl: RMRKNestableMultiAssetLazyMintNativeSoulbound;
  let equippableLazyMintNativeImpl: RMRKEquippableLazyMintNative;
  let equippableLazyMintNativeSoulboundImpl: RMRKEquippableLazyMintNativeSoulbound;
  let multiAssetLazyMintErc20Impl: RMRKMultiAssetLazyMintErc20;
  let multiAssetLazyMintErc20SoulboundImpl: RMRKMultiAssetLazyMintErc20Soulbound;
  let nestableLazyMintErc20Impl: RMRKNestableLazyMintErc20;
  let nestableLazyMintErc20SoulboundImpl: RMRKNestableLazyMintErc20Soulbound;
  let nestableMultiAssetLazyMintErc20Impl: RMRKNestableMultiAssetLazyMintErc20;
  let nestableMultiAssetLazyMintErc20SoulboundImpl: RMRKNestableMultiAssetLazyMintErc20Soulbound;
  let equippableLazyMintErc20Impl: RMRKEquippableLazyMintErc20;
  let equippableLazyMintErc20SoulboundImpl: RMRKEquippableLazyMintErc20Soulbound;
  let rmrkERC20: ERC20Mock;
  let owner: SignerWithAddress;
  let holder: SignerWithAddress;
  let royaltyRecipient: SignerWithAddress;

  async function deployImplementationsFixture() {
    const [owner, royaltyRecipient, holder, ...signersAddr] =
      await ethers.getSigners();

    const ERC20Factory = await ethers.getContractFactory(
      'contracts/mocks/ERC20Mock.sol:ERC20Mock',
    );
    const rmrkERC20 = <ERC20Mock>await ERC20Factory.deploy();
    await rmrkERC20.mint(owner.address, ethers.parseEther('1000000'));

    // Pre Mint
    const multiAssetPreMintImplFactory = await ethers.getContractFactory(
      'RMRKMultiAssetPreMint',
    );
    const multiAssetPreMintSoulboundImplFactory =
      await ethers.getContractFactory('RMRKMultiAssetPreMintSoulbound');
    const nestablePreMintImplFactory = await ethers.getContractFactory(
      'RMRKNestablePreMint',
    );
    const nestablePreMintSoulboundImplFactory = await ethers.getContractFactory(
      'RMRKNestablePreMintSoulbound',
    );
    const nestableMultiAssetPreMintImplFactory =
      await ethers.getContractFactory('RMRKNestableMultiAssetPreMint');
    const nestableMultiAssetPreMintSoulboundImplFactory =
      await ethers.getContractFactory('RMRKNestableMultiAssetPreMintSoulbound');
    const equippablePreMintFactory = await ethers.getContractFactory(
      'RMRKEquippablePreMint',
    );
    const equippablePreMintSoulboundImplFactory =
      await ethers.getContractFactory('RMRKEquippablePreMintSoulbound');

    // Lazy Mint Native
    const multiAssetLazyMintNativeImplFactory = await ethers.getContractFactory(
      'RMRKMultiAssetLazyMintNative',
    );
    const multiAssetLazyMintNativeSoulboundImplFactory =
      await ethers.getContractFactory('RMRKMultiAssetLazyMintNativeSoulbound');
    const nestableLazyMintNativeImplFactory = await ethers.getContractFactory(
      'RMRKNestableLazyMintNative',
    );
    const nestableLazyMintNativeSoulboundImplFactory =
      await ethers.getContractFactory('RMRKNestableLazyMintNativeSoulbound');
    const nestableMultiAssetLazyMintNativeImplFactory =
      await ethers.getContractFactory('RMRKNestableMultiAssetLazyMintNative');
    const nestableMultiAssetLazyMintNativeSoulboundImplFactory =
      await ethers.getContractFactory(
        'RMRKNestableMultiAssetLazyMintNativeSoulbound',
      );
    const equippableLazyMintNativeImplFactory = await ethers.getContractFactory(
      'RMRKEquippableLazyMintNative',
    );
    const equippableLazyMintNativeSoulboundImplFactory =
      await ethers.getContractFactory('RMRKEquippableLazyMintNativeSoulbound');

    // Lazy Mint ERC20
    const multiAssetLazyMintErc20ImplFactory = await ethers.getContractFactory(
      'RMRKMultiAssetLazyMintErc20',
    );
    const multiAssetLazyMintErc20SoulboundImplFactory =
      await ethers.getContractFactory('RMRKMultiAssetLazyMintErc20Soulbound');
    const nestableLazyMintErc20ImplFactory = await ethers.getContractFactory(
      'RMRKNestableLazyMintErc20',
    );
    const nestableLazyMintErc20SoulboundImplFactory =
      await ethers.getContractFactory('RMRKNestableLazyMintErc20Soulbound');
    const nestableMultiAssetLazyMintErc20ImplFactory =
      await ethers.getContractFactory('RMRKNestableMultiAssetLazyMintErc20');
    const nestableMultiAssetLazyMintErc20SoulboundImplFactory =
      await ethers.getContractFactory(
        'RMRKNestableMultiAssetLazyMintErc20Soulbound',
      );
    const equippableLazyMintErc20ImplFactory = await ethers.getContractFactory(
      'RMRKEquippableLazyMintErc20',
    );
    const equippableLazyMintErc20SoulboundImplFactory =
      await ethers.getContractFactory('RMRKEquippableLazyMintErc20Soulbound');

    const deployArgsPreMint = [
      name,
      symbol,
      collectionMetadataUri,
      maxSupply,
      await royaltyRecipient.getAddress(),
      500,
    ] as const;

    const deployArgsLazyMintERC20Pay = [
      name,
      symbol,
      collectionMetadataUri,
      baseTokenURI,
      {
        maxSupply,
        pricePerMint,
        royaltyPercentageBps: 500,
        royaltyRecipient: await royaltyRecipient.getAddress(),
        erc20TokenAddress: ethers.ZeroAddress,
      },
    ] as const;

    const deployArgsLazyMintNativePay = [
      name,
      symbol,
      collectionMetadataUri,
      baseTokenURI,
      {
        maxSupply,
        pricePerMint,
        royaltyPercentageBps: 500,
        royaltyRecipient: await royaltyRecipient.getAddress(),
      },
    ] as const;

    const multiAssetPreMintImpl = <RMRKMultiAssetPreMint>(
      await multiAssetPreMintImplFactory.deploy(...deployArgsPreMint)
    );
    const multiAssetPreMintSoulboundImpl = <RMRKMultiAssetPreMintSoulbound>(
      await multiAssetPreMintSoulboundImplFactory.deploy(...deployArgsPreMint)
    );
    const nestablePreMintImpl = <RMRKNestablePreMint>(
      await nestablePreMintImplFactory.deploy(...deployArgsPreMint)
    );
    const nestablePreMintSoulboundImpl = <RMRKNestablePreMintSoulbound>(
      await nestablePreMintSoulboundImplFactory.deploy(...deployArgsPreMint)
    );
    const nestableMultiAssetPreMintImpl = <RMRKNestableMultiAssetPreMint>(
      await nestableMultiAssetPreMintImplFactory.deploy(...deployArgsPreMint)
    );
    const nestableMultiAssetPreMintSoulboundImpl = <
      RMRKNestableMultiAssetPreMintSoulbound
    >await nestableMultiAssetPreMintSoulboundImplFactory.deploy(
      ...deployArgsPreMint,
    );
    const equippablePreMintImpl = <RMRKEquippablePreMint>(
      await equippablePreMintFactory.deploy(...deployArgsPreMint)
    );
    const equippablePreMintSoulboundImpl = <RMRKEquippablePreMintSoulbound>(
      await equippablePreMintSoulboundImplFactory.deploy(...deployArgsPreMint)
    );

    const multiAssetLazyMintNativeImpl = <RMRKMultiAssetLazyMintNative>(
      await multiAssetLazyMintNativeImplFactory.deploy(
        ...deployArgsLazyMintNativePay,
      )
    );
    const multiAssetLazyMintNativeSoulboundImpl = <
      RMRKMultiAssetLazyMintNativeSoulbound
    >await multiAssetLazyMintNativeSoulboundImplFactory.deploy(
      ...deployArgsLazyMintNativePay,
    );
    const nestableLazyMintNativeImpl = <RMRKNestableMultiAssetLazyMintNative>(
      await nestableLazyMintNativeImplFactory.deploy(
        ...deployArgsLazyMintNativePay,
      )
    );
    const nestableLazyMintNativeSoulboundImpl = <
      RMRKNestableMultiAssetLazyMintNativeSoulbound
    >await nestableLazyMintNativeSoulboundImplFactory.deploy(
      ...deployArgsLazyMintNativePay,
    );
    const nestableMultiAssetLazyMintNativeImpl = <
      RMRKNestableMultiAssetLazyMintNative
    >await nestableMultiAssetLazyMintNativeImplFactory.deploy(
      ...deployArgsLazyMintNativePay,
    );
    const nestableMultiAssetLazyMintNativeSoulboundImpl = <
      RMRKNestableMultiAssetLazyMintNativeSoulbound
    >await nestableMultiAssetLazyMintNativeSoulboundImplFactory.deploy(
      ...deployArgsLazyMintNativePay,
    );
    const equippableLazyMintNativeImpl = <RMRKEquippableLazyMintNative>(
      await equippableLazyMintNativeImplFactory.deploy(
        ...deployArgsLazyMintNativePay,
      )
    );
    const equippableLazyMintNativeSoulboundImpl = <
      RMRKEquippableLazyMintNativeSoulbound
    >await equippableLazyMintNativeSoulboundImplFactory.deploy(
      ...deployArgsLazyMintNativePay,
    );

    // @ts-ignore
    deployArgsLazyMintERC20Pay[4].erc20TokenAddress =
      await rmrkERC20.getAddress();

    const multiAssetLazyMintErc20Impl = <RMRKMultiAssetLazyMintErc20>(
      await multiAssetLazyMintErc20ImplFactory.deploy(
        ...deployArgsLazyMintERC20Pay,
      )
    );
    const multiAssetLazyMintErc20SoulboundImpl = <
      RMRKMultiAssetLazyMintErc20Soulbound
    >await multiAssetLazyMintErc20SoulboundImplFactory.deploy(
      ...deployArgsLazyMintERC20Pay,
    );
    const nestableLazyMintErc20Impl = <RMRKNestableMultiAssetLazyMintErc20>(
      await nestableLazyMintErc20ImplFactory.deploy(
        ...deployArgsLazyMintERC20Pay,
      )
    );
    const nestableLazyMintErc20SoulboundImpl = <
      RMRKNestableMultiAssetLazyMintErc20Soulbound
    >await nestableLazyMintErc20SoulboundImplFactory.deploy(
      ...deployArgsLazyMintERC20Pay,
    );
    const nestableMultiAssetLazyMintErc20Impl = <
      RMRKNestableMultiAssetLazyMintErc20
    >await nestableMultiAssetLazyMintErc20ImplFactory.deploy(
      ...deployArgsLazyMintERC20Pay,
    );
    const nestableMultiAssetLazyMintErc20SoulboundImpl = <
      RMRKNestableMultiAssetLazyMintErc20Soulbound
    >await nestableMultiAssetLazyMintErc20SoulboundImplFactory.deploy(
      ...deployArgsLazyMintERC20Pay,
    );
    const equippableLazyMintErc20Impl = <RMRKEquippableLazyMintErc20>(
      await equippableLazyMintErc20ImplFactory.deploy(
        ...deployArgsLazyMintERC20Pay,
      )
    );
    const equippableLazyMintErc20SoulboundImpl = <
      RMRKEquippableLazyMintErc20Soulbound
    >await equippableLazyMintErc20SoulboundImplFactory.deploy(
      ...deployArgsLazyMintERC20Pay,
    );

    return {
      rmrkERC20,
      owner,
      holder,
      royaltyRecipient,
      equippableLazyMintErc20Impl,
      equippableLazyMintErc20SoulboundImpl,
      equippableLazyMintNativeImpl,
      equippableLazyMintNativeSoulboundImpl,
      equippablePreMintImpl,
      equippablePreMintSoulboundImpl,
      multiAssetLazyMintErc20Impl,
      multiAssetLazyMintErc20SoulboundImpl,
      multiAssetLazyMintNativeImpl,
      multiAssetLazyMintNativeSoulboundImpl,
      multiAssetPreMintImpl,
      multiAssetPreMintSoulboundImpl,
      nestableLazyMintErc20Impl,
      nestableLazyMintErc20SoulboundImpl,
      nestableLazyMintNativeImpl,
      nestableLazyMintNativeSoulboundImpl,
      nestablePreMintImpl,
      nestablePreMintSoulboundImpl,
      nestableMultiAssetLazyMintErc20Impl,
      nestableMultiAssetLazyMintErc20SoulboundImpl,
      nestableMultiAssetLazyMintNativeImpl,
      nestableMultiAssetLazyMintNativeSoulboundImpl,
      nestableMultiAssetPreMintImpl,
      nestableMultiAssetPreMintSoulboundImpl,
    };
  }

  beforeEach(async function () {
    ({
      owner,
      holder,
      royaltyRecipient,
      rmrkERC20,
      equippableLazyMintErc20Impl,
      equippableLazyMintErc20SoulboundImpl,
      equippableLazyMintNativeImpl,
      equippableLazyMintNativeSoulboundImpl,
      equippablePreMintImpl,
      equippablePreMintSoulboundImpl,
      multiAssetLazyMintErc20Impl,
      multiAssetLazyMintErc20SoulboundImpl,
      multiAssetLazyMintNativeImpl,
      multiAssetLazyMintNativeSoulboundImpl,
      multiAssetPreMintImpl,
      multiAssetPreMintSoulboundImpl,
      nestableLazyMintErc20Impl,
      nestableLazyMintErc20SoulboundImpl,
      nestableLazyMintNativeImpl,
      nestableLazyMintNativeSoulboundImpl,
      nestablePreMintImpl,
      nestablePreMintSoulboundImpl,
      nestableMultiAssetLazyMintErc20Impl,
      nestableMultiAssetLazyMintErc20SoulboundImpl,
      nestableMultiAssetLazyMintNativeImpl,
      nestableMultiAssetLazyMintNativeSoulboundImpl,
      nestableMultiAssetPreMintImpl,
      nestableMultiAssetPreMintSoulboundImpl,
    } = await loadFixture(deployImplementationsFixture));
    this.owner = owner;
    this.holder = holder;
    this.royaltyRecipient = royaltyRecipient;
    this.rmrkERC20 = rmrkERC20;
  });

  describe('RMRKMultiAssetPreMint', async () => {
    beforeEach(async function () {
      this.contract = multiAssetPreMintImpl;
    });

    testInterfaceSupport(LegoCombination.MultiAsset, false);
    testMultiAssetBehavior(MintingType.RMRKPreMint);
    testGeneralBehavior(MintingType.RMRKPreMint);
  });

  describe('RMRKMultiAssetPreMintSoulbound', async () => {
    beforeEach(async function () {
      this.contract = multiAssetPreMintSoulboundImpl;
    });

    testInterfaceSupport(LegoCombination.MultiAsset, true);
    testMultiAssetBehavior(MintingType.RMRKPreMint);
    testGeneralBehavior(MintingType.RMRKPreMint);
  });

  describe('RMRKNestableLazyMintErc20', async () => {
    beforeEach(async function () {
      this.contract = nestableLazyMintErc20Impl;
    });

    testInterfaceSupport(LegoCombination.Nestable, false);
    testGeneralBehavior(MintingType.RMRKLazyMintERC20);
  });

  describe('RMRKNestableLazyMintErc20Soulbound', async () => {
    beforeEach(async function () {
      this.contract = nestableLazyMintErc20SoulboundImpl;
    });

    testInterfaceSupport(LegoCombination.Nestable, true);
    testGeneralBehavior(MintingType.RMRKLazyMintERC20);
  });

  describe('RMRKNestableMultiAssetPreMint', async () => {
    beforeEach(async function () {
      this.contract = nestableMultiAssetPreMintImpl;
    });

    testInterfaceSupport(LegoCombination.NestableMultiAsset, false);
    testMultiAssetBehavior(MintingType.RMRKPreMint);
    testGeneralBehavior(MintingType.RMRKPreMint);
  });

  describe('RMRKNestableMultiAssetPreMintSoulbound', async () => {
    beforeEach(async function () {
      this.contract = nestableMultiAssetPreMintSoulboundImpl;
    });

    testInterfaceSupport(LegoCombination.NestableMultiAsset, true);
    testMultiAssetBehavior(MintingType.RMRKPreMint);
    testGeneralBehavior(MintingType.RMRKPreMint);
  });

  describe('RMRKEquippablePreMint', async () => {
    beforeEach(async function () {
      this.contract = equippablePreMintImpl;
    });

    testInterfaceSupport(LegoCombination.Equippable, false);
    testMultiAssetBehavior(MintingType.RMRKPreMint);
    testEquippableBehavior(MintingType.RMRKPreMint);
    testGeneralBehavior(MintingType.RMRKPreMint);
  });

  describe('RMRKEquippablePreMintSoulbound', async () => {
    beforeEach(async function () {
      this.contract = equippablePreMintSoulboundImpl;
    });

    testInterfaceSupport(LegoCombination.Equippable, true);
    testMultiAssetBehavior(MintingType.RMRKPreMint);
    testEquippableBehavior(MintingType.RMRKPreMint);
    testGeneralBehavior(MintingType.RMRKPreMint);
  });

  describe('RMRKMultiAssetLazyMintNative', async () => {
    beforeEach(async function () {
      this.contract = multiAssetLazyMintNativeImpl;
    });

    testInterfaceSupport(LegoCombination.MultiAsset, false);
    testMultiAssetBehavior(MintingType.RMRKLazyMintNativeToken);
    testGeneralBehavior(MintingType.RMRKLazyMintNativeToken);
  });

  describe('RMRKMultiAssetLazyMintNativeSoulbound', async () => {
    beforeEach(async function () {
      this.contract = multiAssetLazyMintNativeSoulboundImpl;
    });

    testInterfaceSupport(LegoCombination.MultiAsset, true);
    testMultiAssetBehavior(MintingType.RMRKLazyMintNativeToken);
    testGeneralBehavior(MintingType.RMRKLazyMintNativeToken);
  });

  describe('RMRKNestableLazyMintNative', async () => {
    beforeEach(async function () {
      this.contract = nestableLazyMintNativeImpl;
    });

    testInterfaceSupport(LegoCombination.Nestable, false);
    testGeneralBehavior(MintingType.RMRKLazyMintNativeToken);
  });

  describe('RMRKNestableLazyMintNativeSoulbound', async () => {
    beforeEach(async function () {
      this.contract = nestableLazyMintNativeSoulboundImpl;
    });

    testInterfaceSupport(LegoCombination.Nestable, true);
    testGeneralBehavior(MintingType.RMRKLazyMintNativeToken);
  });

  describe('RMRKNestableMultiAssetLazyMintNative', async () => {
    beforeEach(async function () {
      this.contract = nestableMultiAssetLazyMintNativeImpl;
    });

    testInterfaceSupport(LegoCombination.NestableMultiAsset, false);
    testMultiAssetBehavior(MintingType.RMRKLazyMintNativeToken);
    testGeneralBehavior(MintingType.RMRKLazyMintNativeToken);
  });

  describe('RMRKNestableMultiAssetLazyMintNativeSoulbound', async () => {
    beforeEach(async function () {
      this.contract = nestableMultiAssetLazyMintNativeSoulboundImpl;
    });

    testInterfaceSupport(LegoCombination.NestableMultiAsset, true);
    testMultiAssetBehavior(MintingType.RMRKLazyMintNativeToken);
    testGeneralBehavior(MintingType.RMRKLazyMintNativeToken);
  });

  describe('RMRKEquippableLazyMintNative', async () => {
    beforeEach(async function () {
      this.contract = equippableLazyMintNativeImpl;
    });

    testInterfaceSupport(LegoCombination.Equippable, false);
    testMultiAssetBehavior(MintingType.RMRKLazyMintNativeToken);
    testEquippableBehavior(MintingType.RMRKLazyMintNativeToken);
    testGeneralBehavior(MintingType.RMRKLazyMintNativeToken);
  });

  describe('RMRKEquippableLazyMintNativeSoulbound', async () => {
    beforeEach(async function () {
      this.contract = equippableLazyMintNativeSoulboundImpl;
    });

    testInterfaceSupport(LegoCombination.Equippable, true);
    testMultiAssetBehavior(MintingType.RMRKLazyMintNativeToken);
    testEquippableBehavior(MintingType.RMRKLazyMintNativeToken);
    testGeneralBehavior(MintingType.RMRKLazyMintNativeToken);
  });

  describe('RMRKNestableMultiAssetLazyMintErc20', async () => {
    beforeEach(async function () {
      this.contract = nestableMultiAssetLazyMintErc20Impl;
    });

    testInterfaceSupport(LegoCombination.NestableMultiAsset, false);
    testMultiAssetBehavior(MintingType.RMRKLazyMintERC20);
    testGeneralBehavior(MintingType.RMRKLazyMintERC20);
  });

  describe('RMRKMultiAssetLazyMintErc20', async () => {
    beforeEach(async function () {
      this.contract = multiAssetLazyMintErc20Impl;
    });

    testInterfaceSupport(LegoCombination.MultiAsset, false);
    testMultiAssetBehavior(MintingType.RMRKLazyMintERC20);
    testGeneralBehavior(MintingType.RMRKLazyMintERC20);
  });

  describe('RMRKMultiAssetLazyMintErc20Soulbound', async () => {
    beforeEach(async function () {
      this.contract = multiAssetLazyMintErc20SoulboundImpl;
    });

    testInterfaceSupport(LegoCombination.MultiAsset, true);
    testMultiAssetBehavior(MintingType.RMRKLazyMintERC20);
    testGeneralBehavior(MintingType.RMRKLazyMintERC20);
  });

  describe('RMRKNestablePreMint', async () => {
    beforeEach(async function () {
      this.contract = nestablePreMintImpl;
    });

    testInterfaceSupport(LegoCombination.Nestable, false);
    testGeneralBehavior(MintingType.RMRKPreMint);
  });

  describe('RMRKNestablePreMintSoulbound', async () => {
    beforeEach(async function () {
      this.contract = nestablePreMintSoulboundImpl;
    });

    testInterfaceSupport(LegoCombination.Nestable, true);
    testGeneralBehavior(MintingType.RMRKPreMint);
  });

  describe('RMRKNestableMultiAssetLazyMintErc20Soulbound', async () => {
    beforeEach(async function () {
      this.contract = nestableMultiAssetLazyMintErc20SoulboundImpl;
    });

    testInterfaceSupport(LegoCombination.NestableMultiAsset, true);
    testMultiAssetBehavior(MintingType.RMRKLazyMintERC20);
    testGeneralBehavior(MintingType.RMRKLazyMintERC20);
  });

  describe('RMRKEquippableLazyMintErc20', async () => {
    beforeEach(async function () {
      this.contract = equippableLazyMintErc20Impl;
    });

    testInterfaceSupport(LegoCombination.Equippable, false);
    testMultiAssetBehavior(MintingType.RMRKLazyMintERC20);
    testEquippableBehavior(MintingType.RMRKLazyMintERC20);
    testGeneralBehavior(MintingType.RMRKLazyMintERC20);
  });

  describe('RMRKEquippableLazyMintErc20Soulbound', async () => {
    beforeEach(async function () {
      this.contract = equippableLazyMintErc20SoulboundImpl;
    });

    testInterfaceSupport(LegoCombination.Equippable, true);
    testMultiAssetBehavior(MintingType.RMRKLazyMintERC20);
    testEquippableBehavior(MintingType.RMRKLazyMintERC20);
    testGeneralBehavior(MintingType.RMRKLazyMintERC20);
  });
});

async function testInterfaceSupport(
  legoCombination: LegoCombination,
  isSoulbound: boolean,
) {
  let contract: Contract;

  beforeEach(async function () {
    contract = this.contract;
  });

  describe('Interface Support', async () => {
    it('supports basic interfaces', async () => {
      expect(await contract.supportsInterface(IERC165)).to.be.true;
      expect(await contract.supportsInterface(IERC721)).to.be.true;
      expect(await contract.supportsInterface(IERC721Metadata)).to.be.true;
    });

    it('supports RMRK interfaces', async () => {
      expect(await contract.supportsInterface(IRMRKImplementation)).to.be.true;
      expect(await contract.supportsInterface(IERC2981)).to.be.true;
      if (
        [
          LegoCombination.MultiAsset,
          LegoCombination.NestableMultiAsset,
          LegoCombination.Equippable,
        ].includes(legoCombination)
      ) {
        expect(await contract.supportsInterface(IERC5773)).to.be.true;
      } else {
        expect(await contract.supportsInterface(IERC5773)).to.be.false;
      }

      if (
        [
          LegoCombination.Equippable,
          LegoCombination.Nestable,
          LegoCombination.NestableMultiAsset,
        ].includes(legoCombination)
      ) {
        expect(await contract.supportsInterface(IERC7401)).to.be.true;
      } else {
        expect(await contract.supportsInterface(IERC7401)).to.be.false;
      }

      if (legoCombination == LegoCombination.Equippable) {
        expect(await contract.supportsInterface(IERC6220)).to.be.true;
      } else {
        expect(await contract.supportsInterface(IERC6220)).to.be.false;
      }

      if (isSoulbound) {
        expect(await contract.supportsInterface(IERC6454)).to.be.true;
      } else {
        expect(await contract.supportsInterface(IERC6454)).to.be.false;
      }
    });

    it('does not support a random interface', async () => {
      expect(await contract.supportsInterface('0xffffffff')).to.be.false;
    });
  });
}

async function testMultiAssetBehavior(mintingType: MintingType) {
  let contract: GenericMultiAsset;
  let owner: SignerWithAddress;
  let holder: SignerWithAddress;
  let rmrkERC20: ERC20Mock;

  beforeEach(async function () {
    contract = this.contract;
    owner = this.owner;
    holder = this.holder;
    rmrkERC20 = this.rmrkERC20;
  });

  describe('Add assets Behavior', async () => {
    it('cannot add assets if not owner or contributor', async () => {
      await expect(
        contract.connect(holder).addAssetEntry('metadata'),
      ).to.be.revertedWithCustomError(contract, 'RMRKNotOwnerOrContributor');
    });

    it('cannot add asset to token if not owner or contributor', async () => {
      await mint(holder.address, contract, owner, rmrkERC20, mintingType);
      await contract.connect(owner).addAssetEntry('metadata');
      const assetId = await contract.totalAssets();
      const tokenId = await contract.totalSupply();
      await expect(
        contract.connect(holder).addAssetToToken(tokenId, assetId, 0),
      ).to.be.revertedWithCustomError(contract, 'RMRKNotOwnerOrContributor');
    });
  });

  describe('Auto Accept Behavior', async () => {
    it('auto accepts the first asset', async () => {
      await mint(holder.address, contract, owner, rmrkERC20, mintingType);
      await contract.addAssetEntry('metadata');
      await contract.connect(owner).addAssetToToken(1, 1, 0);

      expect(await contract.getActiveAssets(1)).to.eql([1n]);
    });

    it('auto accepts the other assets if sender is the holder', async () => {
      await mint(owner.address, contract, owner, rmrkERC20, mintingType);
      await contract.addAssetEntry('metadata');
      await contract.addAssetEntry('metadata2');
      await contract.connect(owner).addAssetToToken(1, 1, 0);
      await contract.connect(owner).addAssetToToken(1, 2, 0);
      expect(await contract.getActiveAssets(1)).to.eql([1n, 2n]);
    });

    it('does not auto accept the second asset', async () => {
      await mint(holder.address, contract, owner, rmrkERC20, mintingType);
      await contract.addAssetEntry('metadata');
      await contract.addAssetEntry('metadata');
      await contract.connect(owner).addAssetToToken(1, 1, 0);
      await contract.connect(owner).addAssetToToken(1, 2, 0);

      expect(await contract.getActiveAssets(1)).to.eql([1n]);
    });
  });
}

async function testEquippableBehavior(mintingType: MintingType) {
  let contract: RMRKAbstractEquippable;
  let owner: SignerWithAddress;
  let holder: SignerWithAddress;
  let rmrkERC20: ERC20Mock;

  beforeEach(async function () {
    contract = this.contract;
    owner = this.owner;
    holder = this.holder;
    rmrkERC20 = this.rmrkERC20;
  });

  describe('Equippable Behavior', async () => {
    it('can add equippable assets', async () => {
      await mint(holder.address, contract, owner, rmrkERC20, mintingType);
      const equippableGroupId = 1n;
      const catalogAddress = await rmrkERC20.getAddress(); // Could be any address
      const metadataURI = 'ipfs://asset-metadata';
      const partIds = [1n, 2n, 3n];
      await contract.addEquippableAssetEntry(
        equippableGroupId,
        catalogAddress,
        metadataURI,
        partIds,
      );
      const assetId = await contract.totalAssets();
      const tokenId = await contract.totalSupply();

      await contract.connect(owner).addAssetToToken(tokenId, assetId, 0);
      expect(await contract.getAssetAndEquippableData(tokenId, assetId)).to.eql(
        [metadataURI, equippableGroupId, catalogAddress, partIds.map(BigInt)],
      );
    });

    it('can set valid parent for equippable group', async () => {
      const equippableGroupId = 1n;
      const partId = 10n;
      await expect(
        contract.setValidParentForEquippableGroup(
          equippableGroupId,
          await contract.getAddress(),
          partId,
        ),
      )
        .to.emit(contract, 'ValidParentEquippableGroupIdSet')
        .withArgs(equippableGroupId, partId, await contract.getAddress());
    });

    it('cannot add equippable assets if not owner or contributor', async () => {
      await expect(
        contract
          .connect(holder)
          .addEquippableAssetEntry(
            1,
            await rmrkERC20.getAddress(),
            'ipfs://asset-metadata',
            [1, 2, 3],
          ),
      ).to.be.revertedWithCustomError(contract, 'RMRKNotOwnerOrContributor');
    });

    it('cannot set valid parent for equippable group if not owner or contributor', async () => {
      const equippableGroupId = 1n;
      const partId = 10;
      await expect(
        contract
          .connect(holder)
          .setValidParentForEquippableGroup(
            equippableGroupId,
            await contract.getAddress(),
            partId,
          ),
      ).to.be.revertedWithCustomError(contract, 'RMRKNotOwnerOrContributor');
    });
  });
}

async function testGeneralBehavior(mintingType: MintingType) {
  let contract: GenericAbstractImplementation;
  let owner: SignerWithAddress;
  let holder: SignerWithAddress;
  let royaltyRecipient: SignerWithAddress;
  let rmrkERC20: ERC20Mock;

  beforeEach(async function () {
    contract = this.contract;
    owner = this.owner;
    holder = this.holder;
    royaltyRecipient = this.royaltyRecipient;
    rmrkERC20 = this.rmrkERC20;
  });

  describe('General Behavior', async () => {
    it('can update royalties recepient if owner or owner', async () => {
      await contract.connect(owner).updateRoyaltyRecipient(holder.address);
      expect(await contract.getRoyaltyRecipient()).to.eql(holder.address);
    });

    it('cannot update royalties recepient if owner or owner', async () => {
      await expect(
        contract.connect(holder).updateRoyaltyRecipient(holder.address),
      ).to.be.revertedWithCustomError(contract, 'RMRKNotOwner');
    });

    it('reduces total supply on burn and id not reduced', async () => {
      await mint(holder.address, contract, owner, rmrkERC20, mintingType);
      await (<RMRKNestableMultiAssetPreMint>contract)
        .connect(holder)
        ['burn(uint256)'](1);
      expect(await contract.totalSupply()).to.eql(0n);

      await mint(holder.address, contract, owner, rmrkERC20, mintingType);
      expect(await contract.ownerOf(2)).to.eql(holder.address);
    });

    it('cannot burn if not token owner', async () => {
      await mint(holder.address, contract, owner, rmrkERC20, mintingType);
      const expectedError = (await contract.supportsInterface(IERC7401))
        ? 'RMRKNotApprovedOrDirectOwner'
        : 'ERC721NotApprovedOrOwner';
      await expect(
        (<RMRKNestableMultiAssetPreMint>contract)
          .connect(owner)
          ['burn(uint256)'](1),
      ).to.be.revertedWithCustomError(contract, expectedError);
    });

    it('cannot mint 0 tokens', async () => {
      if (mintingType == MintingType.RMRKPreMint) {
        await expect(
          (<GenericMintablePreMint>contract)
            .connect(owner)
            .mint(holder.address, 0, 'ipfs://tokenURI'),
        ).to.be.revertedWithCustomError(contract, 'RMRKMintZero');
      } else if (mintingType == MintingType.RMRKLazyMintNativeToken) {
        await expect(
          (<GenericMintableNativeToken>contract)
            .connect(owner)
            .mint(holder.address, 0, { value: pricePerMint }),
        ).to.be.revertedWithCustomError(contract, 'RMRKMintZero');
      } else if (mintingType == MintingType.RMRKLazyMintERC20) {
        await rmrkERC20
          .connect(owner)
          .approve(await contract.getAddress(), pricePerMint);
        await expect(
          (<GenericMintableERC20Pay>contract)
            .connect(owner)
            .mint(holder.address, 0),
        ).to.be.revertedWithCustomError(contract, 'RMRKMintZero');
      }
    });

    it('has expected tokenURI', async () => {
      await mint(holder.address, contract, owner, rmrkERC20, mintingType);
      if (mintingType == MintingType.RMRKPreMint) {
        expect(await (<GenericReadyToUse>contract).tokenURI(1)).to.eql(
          'ipfs://tokenURI',
        );
      } else {
        expect(await (<GenericReadyToUse>contract).tokenURI(1)).to.eql(
          'ipfs://tokenURI/1',
        );
      }
    });

    it('can get price per mint', async () => {
      if (
        mintingType == MintingType.RMRKLazyMintERC20 ||
        mintingType == MintingType.RMRKLazyMintNativeToken
      ) {
        expect(await (<GenericMintableERC20Pay>contract).pricePerMint()).to.eql(
          pricePerMint,
        );
      }
    });

    it('can withdraw raised', async () => {
      await mint(holder.address, contract, owner, rmrkERC20, mintingType);
      await mint(holder.address, contract, owner, rmrkERC20, mintingType);
      if (mintingType == MintingType.RMRKLazyMintNativeToken) {
        const balanceBefore = await ethers.provider.getBalance(holder.address);
        await (<GenericMintableNativeToken>contract)
          .connect(owner)
          .withdraw(holder.address, pricePerMint * 2n);
        const balanceAfter = await ethers.provider.getBalance(holder.address);
        expect(balanceAfter).to.eql(balanceBefore + pricePerMint * 2n);
      } else if (mintingType == MintingType.RMRKLazyMintERC20) {
        const balanceBefore = await rmrkERC20.balanceOf(holder.address);
        await (<GenericMintableERC20Pay>contract)
          .connect(owner)
          .withdrawRaisedERC20(
            await rmrkERC20.getAddress(),
            holder.address,
            pricePerMint * 2n,
          );
        const balanceAfter = await rmrkERC20.balanceOf(holder.address);
        expect(balanceAfter).to.eql(balanceBefore + pricePerMint * 2n);
      } else {
        // premint collects nothing
      }
    });

    it('cannot withdraw raised if not owner', async () => {
      await mint(holder.address, contract, owner, rmrkERC20, mintingType);
      if (mintingType == MintingType.RMRKLazyMintNativeToken) {
        await expect(
          (<GenericMintableNativeToken>contract)
            .connect(holder)
            .withdraw(holder.address, pricePerMint),
        ).to.be.revertedWithCustomError(contract, 'RMRKNotOwner');
      } else if (mintingType == MintingType.RMRKLazyMintERC20) {
        await expect(
          (<GenericMintableERC20Pay>contract)
            .connect(holder)
            .withdrawRaisedERC20(
              await rmrkERC20.getAddress(),
              holder.address,
              pricePerMint,
            ),
        ).to.be.revertedWithCustomError(contract, 'RMRKNotOwner');
      } else {
        // premint collects nothing
      }
    });
  });

  describe('Royalties', async () => {
    it('can get royalty recipient and percentage', async () => {
      expect(await contract.getRoyaltyRecipient()).to.eql(
        await royaltyRecipient.getAddress(),
      );
      expect(await contract.getRoyaltyPercentage()).to.eql(500n);
    });

    it('can get royalty info for token', async () => {
      await mint(holder.address, contract, owner, rmrkERC20, mintingType);
      expect(await contract.royaltyInfo(1, 100n)).to.eql([
        await royaltyRecipient.getAddress(),
        5n,
      ]);
    });
  });
}

async function mint(
  to: string,
  contract: GenericAbstractImplementation,
  owner: SignerWithAddress,
  rmrkERC20: ERC20Mock,
  mintingType: MintingType,
) {
  if (mintingType == MintingType.RMRKPreMint) {
    await (<GenericMintablePreMint>contract)
      .connect(owner)
      .mint(to, 1, 'ipfs://tokenURI');
  } else if (mintingType == MintingType.RMRKLazyMintNativeToken) {
    await (<GenericMintableNativeToken>contract)
      .connect(owner)
      .mint(to, 1, { value: pricePerMint });
  } else if (mintingType == MintingType.RMRKLazyMintERC20) {
    await rmrkERC20
      .connect(owner)
      .approve(await contract.getAddress(), pricePerMint);
    await (<GenericMintableERC20Pay>contract).connect(owner).mint(to, 1);
  }
}
