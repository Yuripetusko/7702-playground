import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  RMRKMultiAssetRenderUtils,
  RMRKNestableMultiAssetMock,
} from '../typechain-types';
import shouldBehaveLikeERC721 from './behavior/erc721';
import shouldBehaveLikeMultiAsset from './behavior/multiasset';
import shouldBehaveLikeNestable from './behavior/nestable';
import {
  addAssetEntryFromMock,
  addAssetToToken,
  mintFromMock,
  nestMintFromMock,
  nestTransfer,
  parentChildFixtureWithArgs,
  singleFixtureWithArgs,
  transfer,
} from './utils';

async function singleFixture(): Promise<{
  token: RMRKNestableMultiAssetMock;
  renderUtils: RMRKMultiAssetRenderUtils;
}> {
  const renderUtilsFactory = await ethers.getContractFactory(
    'RMRKMultiAssetRenderUtils',
  );
  const renderUtils = <RMRKMultiAssetRenderUtils>(
    await renderUtilsFactory.deploy()
  );
  await renderUtils.waitForDeployment();

  const token = <RMRKNestableMultiAssetMock>(
    (<unknown>await singleFixtureWithArgs('RMRKNestableMultiAssetMock', []))
  );
  return { token, renderUtils };
}

async function parentChildFixture(): Promise<{
  parent: RMRKNestableMultiAssetMock;
  child: RMRKNestableMultiAssetMock;
}> {
  const { parent, child } = await parentChildFixtureWithArgs(
    'RMRKNestableMultiAssetMock',
    [],
    [],
  );
  return {
    parent: <RMRKNestableMultiAssetMock>parent,
    child: <RMRKNestableMultiAssetMock>child,
  };
}

describe('NestableMultiAssetMock Nestable Behavior', () => {
  beforeEach(async function () {
    const { parent, child } = await loadFixture(parentChildFixture);
    this.parentToken = parent;
    this.childToken = child;
  });

  shouldBehaveLikeNestable(
    mintFromMock,
    nestMintFromMock,
    transfer,
    nestTransfer,
  );
});

describe('NestableMultiAssetMock MA behavior', async () => {
  beforeEach(async function () {
    const { token, renderUtils } = await loadFixture(singleFixture);
    this.token = token;
    this.renderUtils = renderUtils;
  });

  shouldBehaveLikeMultiAsset(
    mintFromMock,
    addAssetEntryFromMock,
    addAssetToToken,
  );
});

describe('NestableMultiAssetMock ERC721 behavior', () => {
  let token: RMRKNestableMultiAssetMock;

  beforeEach(async function () {
    ({ token } = await loadFixture(singleFixture));
    this.token = token;
    this.receiverFactory =
      await ethers.getContractFactory('ERC721ReceiverMock');
  });

  shouldBehaveLikeERC721('NestableMultiAsset', 'NMA');
});

describe('NestableMultiAssetMock Other Behavior', () => {
  let addrs: SignerWithAddress[];
  let token: RMRKNestableMultiAssetMock;

  beforeEach(async function () {
    const [, ...signersAddr] = await ethers.getSigners();
    addrs = signersAddr;

    ({ token } = await loadFixture(singleFixture));
    this.parentToken = token;
  });

  describe('Approval Cleaning', async () => {
    it('cleans token and assets approvals on transfer', async () => {
      const tokenId = 1;
      const tokenOwner = addrs[1];
      const newOwner = addrs[2];
      const approved = addrs[3];
      await token.mint(tokenOwner.address, tokenId);
      await token.connect(tokenOwner).approve(approved.address, tokenId);
      await token
        .connect(tokenOwner)
        .approveForAssets(approved.address, tokenId);

      expect(await token.getApproved(tokenId)).to.eql(approved.address);
      expect(await token.getApprovedForAssets(tokenId)).to.eql(
        approved.address,
      );

      await token
        .connect(tokenOwner)
        .transferFrom(tokenOwner.address, newOwner.address, tokenId);

      expect(await token.getApproved(tokenId)).to.eql(ethers.ZeroAddress);
      expect(await token.getApprovedForAssets(tokenId)).to.eql(
        ethers.ZeroAddress,
      );
    });

    it('cleans token and assets approvals on burn', async () => {
      const tokenId = 1;
      const tokenOwner = addrs[1];
      const approved = addrs[3];
      await token.mint(tokenOwner.address, tokenId);
      await token.connect(tokenOwner).approve(approved.address, tokenId);
      await token
        .connect(tokenOwner)
        .approveForAssets(approved.address, tokenId);

      expect(await token.getApproved(tokenId)).to.eql(approved.address);
      expect(await token.getApprovedForAssets(tokenId)).to.eql(
        approved.address,
      );

      await token.connect(tokenOwner)['burn(uint256)'](tokenId);

      await expect(token.getApproved(tokenId)).to.be.revertedWithCustomError(
        token,
        'ERC721InvalidTokenId',
      );
      await expect(
        token.getApprovedForAssets(tokenId),
      ).to.be.revertedWithCustomError(token, 'ERC721InvalidTokenId');
    });
  });
});
