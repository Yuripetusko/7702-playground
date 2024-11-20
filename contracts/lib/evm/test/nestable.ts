import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { RMRKNestableMock } from '../typechain-types';
import shouldBehaveLikeERC721 from './behavior/erc721';
import shouldBehaveLikeNestable from './behavior/nestable';
import {
  bn,
  mintFromMock,
  nestMintFromMock,
  nestTransfer,
  parentChildFixtureWithArgs,
  singleFixtureWithArgs,
  transfer,
} from './utils';

async function singleFixture(): Promise<RMRKNestableMock> {
  return <RMRKNestableMock>(
    (<unknown>await singleFixtureWithArgs('RMRKNestableMock', []))
  );
}

async function parentChildFixture(): Promise<{
  parent: RMRKNestableMock;
  child: RMRKNestableMock;
}> {
  const { parent, child } = await parentChildFixtureWithArgs(
    'RMRKNestableMock',
    [],
    [],
  );
  return { parent: <RMRKNestableMock>parent, child: <RMRKNestableMock>child };
}

describe('NestableMock', () => {
  let parent: RMRKNestableMock;
  let child: RMRKNestableMock;
  let owner: SignerWithAddress;

  beforeEach(async function () {
    owner = (await ethers.getSigners())[0];

    ({ parent, child } = await loadFixture(parentChildFixture));
    this.parentToken = parent;
    this.childToken = child;
  });

  shouldBehaveLikeNestable(
    mintFromMock,
    nestMintFromMock,
    transfer,
    nestTransfer,
  );

  describe('Minting', async () => {
    it('cannot mint id 0', async () => {
      const tokenId = 0;
      await expect(
        child.mint(owner.address, tokenId),
      ).to.be.revertedWithCustomError(child, 'RMRKIdZeroForbidden');
    });

    it('cannot nest mint id 0', async () => {
      const parentId = await mintFromMock(child, owner.address);
      const childId = 0;
      await expect(
        child.nestMint(await parent.getAddress(), childId, parentId),
      ).to.be.revertedWithCustomError(child, 'RMRKIdZeroForbidden');
    });

    it('cannot mint already minted token', async () => {
      const tokenId = await mintFromMock(child, owner.address);
      await expect(
        child.mint(owner.address, tokenId),
      ).to.be.revertedWithCustomError(child, 'ERC721TokenAlreadyMinted');
    });

    it('cannot nest mint already minted token', async () => {
      const parentId = await mintFromMock(parent, owner.address);
      const childId = await nestMintFromMock(
        child,
        await parent.getAddress(),
        parentId,
      );

      await expect(
        child.nestMint(await parent.getAddress(), childId, parentId),
      ).to.be.revertedWithCustomError(child, 'ERC721TokenAlreadyMinted');
    });

    it('cannot nest mint already minted token', async () => {
      const parentId = await mintFromMock(parent, owner.address);
      const childId = await nestMintFromMock(
        child,
        await parent.getAddress(),
        parentId,
      );

      await expect(
        child.nestMint(await parent.getAddress(), childId, parentId),
      ).to.be.revertedWithCustomError(child, 'ERC721TokenAlreadyMinted');
    });
  });
});

describe('NestableMock ERC721 behavior', () => {
  let token: RMRKNestableMock;
  beforeEach(async function () {
    token = await loadFixture(singleFixture);
    this.token = token;
    this.receiverFactory =
      await ethers.getContractFactory('ERC721ReceiverMock');
  });

  shouldBehaveLikeERC721('Chunky', 'CHNKY');
});

describe('NestableMock transfer hooks', () => {
  let parent: RMRKNestableMock;
  let child: RMRKNestableMock;
  let owner: SignerWithAddress;
  let otherOwner: SignerWithAddress;

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    owner = signers[0];
    otherOwner = signers[1];

    ({ parent, child } = await loadFixture(parentChildFixture));
    this.parentToken = parent;
    this.childToken = child;
  });

  it('keeps track of balances per NFTs', async () => {
    const parentId = await mintFromMock(parent, owner.address);
    const childId = await nestMintFromMock(
      child,
      await parent.getAddress(),
      parentId,
    );

    expect(await parent.balancePerNftOf(owner.address, 0)).to.eql(bn(1));
    expect(
      await child.balancePerNftOf(await parent.getAddress(), parentId),
    ).to.eql(bn(1));

    await parent.transferChild(
      parentId,
      otherOwner.address,
      0,
      0,
      await child.getAddress(),
      childId,
      true,
      '0x',
    );
    expect(
      await child.balancePerNftOf(await parent.getAddress(), parentId),
    ).to.eql(0n);
    expect(await child.balancePerNftOf(otherOwner.address, 0)).to.eql(bn(1));

    // Nest again
    await child
      .connect(otherOwner)
      .nestTransferFrom(
        otherOwner.address,
        await parent.getAddress(),
        childId,
        parentId,
        '0x',
      );

    expect(
      await child.balancePerNftOf(await parent.getAddress(), parentId),
    ).to.eql(bn(1));
    expect(await child.balancePerNftOf(otherOwner.address, 0)).to.eql(0n);

    await parent.acceptChild(parentId, 0, await child.getAddress(), childId);

    await parent['burn(uint256,uint256)'](parentId, 1);
    expect(await parent.balancePerNftOf(owner.address, 0)).to.eql(0n);
    expect(
      await child.balancePerNftOf(await parent.getAddress(), parentId),
    ).to.eql(0n);
    expect(await child.balancePerNftOf(otherOwner.address, 0)).to.eql(0n);
  });
});
