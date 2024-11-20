import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture, mine } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  RMRKSoulboundAfterBlockNumberMock,
  RMRKSoulboundAfterTransactionsMock,
  RMRKSoulboundEquippableMock,
  RMRKSoulboundMultiAssetMock,
  RMRKSoulboundNestableMock,
  RMRKSoulboundNestableMultiAssetMock,
  RMRKSoulboundPerTokenMock,
} from '../../typechain-types';
import { IERC165, IERC6454, IOtherInterface } from '../interfaces';
import {
  GenericMintableMock,
  GenericNestMintableMock,
  bn,
  mintFromMock,
  nestMintFromMock,
} from '../utils';

type GenericSoulboundNestable =
  | RMRKSoulboundNestableMock
  | RMRKSoulboundNestableMultiAssetMock
  | RMRKSoulboundEquippableMock;

// --------------- FIXTURES -----------------------

async function soulboundMultiAssetFixture() {
  const factory = await ethers.getContractFactory(
    'RMRKSoulboundMultiAssetMock',
  );
  const token = await factory.deploy();
  await token.waitForDeployment();

  return { token };
}

async function soulboundNestableFixture() {
  const factory = await ethers.getContractFactory('RMRKSoulboundNestableMock');
  const token = await factory.deploy();
  await token.waitForDeployment();

  return { token };
}

async function soulboundNestableMultiAssetFixture() {
  const factory = await ethers.getContractFactory(
    'RMRKSoulboundNestableMultiAssetMock',
  );
  const token = await factory.deploy();
  await token.waitForDeployment();

  return { token };
}

async function soulboundEquippableFixture() {
  const factory = await ethers.getContractFactory(
    'RMRKSoulboundEquippableMock',
  );
  const token = await factory.deploy();
  await token.waitForDeployment();

  return { token };
}

describe('RMRKSoulboundMultiAssetMock', async () => {
  beforeEach(async function () {
    const { token } = await loadFixture(soulboundMultiAssetFixture);
    this.token = token;
  });

  shouldBehaveLikeSoulboundBasic();
});

describe('RMRKSoulboundNestableMock', async () => {
  beforeEach(async function () {
    const { token } = await loadFixture(soulboundNestableFixture);
    this.token = token;
  });

  shouldBehaveLikeSoulboundBasic();
  shouldBehaveLikeSoulboundNestable();
});

describe('RMRKSoulboundNestableMultiAssetMock', async () => {
  beforeEach(async function () {
    const { token } = await loadFixture(soulboundNestableMultiAssetFixture);
    this.token = token;
  });

  shouldBehaveLikeSoulboundBasic();
  shouldBehaveLikeSoulboundNestable();
});

describe('RMRKSoulboundEquippableMock', async () => {
  beforeEach(async function () {
    const { token } = await loadFixture(soulboundEquippableFixture);
    this.token = token;
  });

  shouldBehaveLikeSoulboundBasic();
  shouldBehaveLikeSoulboundNestable();
});

describe('RMRKSoulbound variants', async () => {
  let owner: SignerWithAddress;
  let otherOwner: SignerWithAddress;

  beforeEach(async () => {
    [owner, otherOwner] = await ethers.getSigners();
  });

  describe('RMRKSoulboundAfterBlockNumber', async () => {
    const blocksToTransfer = 100;
    let token: RMRKSoulboundAfterBlockNumberMock;
    let initBlock: number;

    beforeEach(async () => {
      const factory = await ethers.getContractFactory(
        'RMRKSoulboundAfterBlockNumberMock',
      );
      const block = await ethers.provider.getBlock('latest');
      if (block === null) throw new Error('Block is null');
      initBlock = block.number;
      token = <RMRKSoulboundAfterBlockNumberMock>(
        await factory.deploy(initBlock + blocksToTransfer)
      );
      await token.waitForDeployment();
    });

    it('can support IERC6454', async () => {
      expect(await token.supportsInterface(IERC6454)).to.equal(true);
    });

    it('can get last block to transfer', async () => {
      expect(await token.getLastBlockToTransfer()).to.equal(
        initBlock + blocksToTransfer,
      );
    });

    it('can transfer before max block', async () => {
      await token.mint(owner.address, 1);
      await token.transferFrom(owner.address, otherOwner.address, 1);
      expect(await token.ownerOf(1)).to.equal(otherOwner.address);
    });

    it('cannot transfer after max block', async () => {
      await token.mint(owner.address, 1);
      await mine(blocksToTransfer + 1);
      await expect(
        token.transferFrom(owner.address, otherOwner.address, 1),
      ).to.be.revertedWithCustomError(token, 'RMRKCannotTransferSoulbound');
    });
  });

  describe('RMRKSoulboundAfterTransactions', async () => {
    const maxTransactions = 2;
    let token: RMRKSoulboundAfterTransactionsMock;

    beforeEach(async () => {
      const factory = await ethers.getContractFactory(
        'RMRKSoulboundAfterTransactionsMock',
      );
      token = <RMRKSoulboundAfterTransactionsMock>(
        await factory.deploy(maxTransactions)
      );
      await token.waitForDeployment();
    });

    it('can support IERC6454', async () => {
      expect(await token.supportsInterface(IERC6454)).to.equal(true);
    });

    it('does not support other interfaces', async () => {
      expect(await token.supportsInterface(IOtherInterface)).to.equal(false);
    });

    it('can transfer token only 2 times', async () => {
      await token.mint(owner.address, 1);
      await token.transferFrom(owner.address, otherOwner.address, 1);
      await expect(
        token
          .connect(otherOwner)
          .transferFrom(otherOwner.address, owner.address, 1),
      )
        .to.emit(token, 'Soulbound')
        .withArgs(1);
      expect(await token.getTransfersPerToken(1)).to.equal(bn(2));
      expect(await token.getMaxNumberOfTransfers()).to.equal(bn(2));

      await expect(
        token.transferFrom(owner.address, otherOwner.address, 1),
      ).to.be.revertedWithCustomError(token, 'RMRKCannotTransferSoulbound');
    });
  });

  describe('RMRKSoulboundPerToken', async () => {
    let token: RMRKSoulboundPerTokenMock;

    beforeEach(async () => {
      const factory = await ethers.getContractFactory(
        'RMRKSoulboundPerTokenMock',
      );
      token = <RMRKSoulboundPerTokenMock>await factory.deploy();
      await token.waitForDeployment();
    });

    it('can support IERC6454', async () => {
      expect(await token.supportsInterface(IERC6454)).to.equal(true);
    });

    it('does not support other interfaces', async () => {
      expect(await token.supportsInterface(IOtherInterface)).to.equal(false);
    });

    it('can transfer token if not soulbound', async () => {
      await expect(token.setSoulbound(1, false))
        .to.emit(token, 'Soulbound')
        .withArgs(1, false);
      await token.mint(owner.address, 1);
      await token.transferFrom(owner.address, otherOwner.address, 1);
      expect(await token.ownerOf(1)).to.equal(otherOwner.address);
    });

    it('cannot transfer token if soulbound', async () => {
      await expect(token.setSoulbound(1, true))
        .to.emit(token, 'Soulbound')
        .withArgs(1, true);
      await token.mint(owner.address, 1);
      await expect(
        token.transferFrom(owner.address, otherOwner.address, 1),
      ).to.be.revertedWithCustomError(token, 'RMRKCannotTransferSoulbound');
    });

    it('cannot set soulbound if not collection owner', async () => {
      await expect(
        token.connect(otherOwner).setSoulbound(1, true),
      ).to.be.revertedWithCustomError(token, 'RMRKNotOwner');
    });
  });
});

async function shouldBehaveLikeSoulboundBasic() {
  let soulbound: GenericMintableMock;
  let owner: SignerWithAddress;
  let otherOwner: SignerWithAddress;
  let tokenId: bigint;

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    owner = signers[0];
    otherOwner = signers[1];
    soulbound = this.token;

    tokenId = await mintFromMock(soulbound, owner.address);
  });

  it('can support IERC165', async () => {
    expect(await soulbound.supportsInterface(IERC165)).to.equal(true);
  });

  it('can support IERC6454', async () => {
    expect(await soulbound.supportsInterface(IERC6454)).to.equal(true);
  });

  it('does not support other interfaces', async () => {
    expect(await soulbound.supportsInterface(IOtherInterface)).to.equal(false);
  });

  it('cannot transfer', async () => {
    expect(
      soulbound.connect(owner).transfer(otherOwner.address, tokenId),
    ).to.be.revertedWithCustomError(soulbound, 'RMRKCannotTransferSoulbound');
  });

  it('can burn', async () => {
    await (<GenericSoulboundNestable>soulbound)
      .connect(owner)
      ['burn(uint256)'](tokenId);
    await expect(soulbound.ownerOf(tokenId)).to.be.revertedWithCustomError(
      soulbound,
      'ERC721InvalidTokenId',
    );
  });
}

async function shouldBehaveLikeSoulboundNestable() {
  let soulbound: GenericNestMintableMock;
  let owner: SignerWithAddress;
  let tokenId: bigint;

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    owner = signers[0];
    soulbound = this.token;

    tokenId = await mintFromMock(soulbound, owner.address);
  });

  it('cannot nest transfer', async () => {
    const otherTokenId = await mintFromMock(soulbound, owner.address);
    expect(
      soulbound
        .connect(owner)
        .nestTransfer(await soulbound.getAddress(), tokenId, otherTokenId),
    ).to.be.revertedWithCustomError(soulbound, 'RMRKCannotTransferSoulbound');
  });

  it('cannot transfer child', async () => {
    const childId = await nestMintFromMock(
      soulbound,
      await soulbound.getAddress(),
      tokenId,
    );
    await soulbound
      .connect(owner)
      .acceptChild(tokenId, 0, await soulbound.getAddress(), childId);
    expect(
      soulbound
        .connect(owner)
        .transferChild(
          tokenId,
          owner.address,
          0,
          0,
          await soulbound.getAddress(),
          childId,
          false,
          '0x',
        ),
    ).to.be.revertedWithCustomError(soulbound, 'RMRKCannotTransferSoulbound');
  });
}
