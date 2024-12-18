import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  ERC20Mock,
  RMRKEquippableLazyMintErc20,
  RMRKMultiAssetLazyMintErc20,
  RMRKNestableLazyMintErc20,
  RMRKNestableMultiAssetLazyMintErc20,
} from '../../typechain-types';
import {
  ADDRESS_ZERO,
  ONE_ETH,
  mintFromErc20Pay,
  nestMintFromErc20Pay,
  singleFixtureWithArgs,
} from '../utils';

async function multiAssetFixture(): Promise<RMRKMultiAssetLazyMintErc20> {
  const erc20Factory = await ethers.getContractFactory('ERC20Mock');
  const erc20 = <ERC20Mock>await erc20Factory.deploy();
  await erc20.waitForDeployment();

  return <RMRKMultiAssetLazyMintErc20>(
    (<unknown>(
      await singleFixtureWithArgs('RMRKMultiAssetLazyMintErc20', [
        'MultiAsset',
        'MA',
        'ipfs://collection-meta',
        'ipfs://tokenURI',
        [await erc20.getAddress(), ADDRESS_ZERO, 0, 10000, ONE_ETH],
      ])
    ))
  );
}

async function nestableFixture(): Promise<RMRKNestableLazyMintErc20> {
  const erc20Factory = await ethers.getContractFactory('ERC20Mock');
  const erc20 = <ERC20Mock>await erc20Factory.deploy();
  await erc20.waitForDeployment();

  return <RMRKNestableLazyMintErc20>(
    (<unknown>(
      await singleFixtureWithArgs('RMRKNestableLazyMintErc20', [
        'Nestable',
        'N',
        'ipfs://collection-meta',
        'ipfs://tokenURI',
        [await erc20.getAddress(), ADDRESS_ZERO, 0, 10000, ONE_ETH],
      ])
    ))
  );
}

async function nestableMultiAssetFixture(): Promise<RMRKNestableMultiAssetLazyMintErc20> {
  const erc20Factory = await ethers.getContractFactory('ERC20Mock');
  const erc20 = <ERC20Mock>await erc20Factory.deploy();
  await erc20.waitForDeployment();

  return <RMRKNestableMultiAssetLazyMintErc20>(
    (<unknown>(
      await singleFixtureWithArgs('RMRKNestableMultiAssetLazyMintErc20', [
        'MultiAsset',
        'MA',
        'ipfs://collection-meta',
        'ipfs://tokenURI',
        [await erc20.getAddress(), ADDRESS_ZERO, 0, 10000, ONE_ETH],
      ])
    ))
  );
}

async function equippableFixture(): Promise<RMRKEquippableLazyMintErc20> {
  const erc20Factory = await ethers.getContractFactory('ERC20Mock');
  const erc20 = await erc20Factory.deploy();
  await erc20.waitForDeployment();

  return <RMRKEquippableLazyMintErc20>(
    (<unknown>(
      await singleFixtureWithArgs('RMRKEquippableLazyMintErc20', [
        'MultiAsset',
        'MA',
        'ipfs://collection-meta',
        'ipfs://tokenURI',
        [await erc20.getAddress(), ADDRESS_ZERO, 0, 10000, ONE_ETH],
      ])
    ))
  );
}

describe('MultiAssetErc20Pay Minting', async () => {
  beforeEach(async function () {
    this.token = await loadFixture(multiAssetFixture);
  });

  shouldControlValidMintingErc20Pay();
});

describe('NestableErc20Pay Minting', async () => {
  beforeEach(async function () {
    this.token = await loadFixture(nestableFixture);
  });

  shouldControlValidMintingErc20Pay();
});

describe('NestableMultiAssetErc20Pay Minting', async () => {
  beforeEach(async function () {
    this.token = await loadFixture(nestableMultiAssetFixture);
  });

  shouldControlValidMintingErc20Pay();
});

describe('EquippableErc20Pay Minting', async () => {
  beforeEach(async function () {
    this.token = await loadFixture(equippableFixture);
  });

  shouldControlValidMintingErc20Pay();
});

async function shouldControlValidMintingErc20Pay(): Promise<void> {
  let addrs: SignerWithAddress[];
  let erc20: ERC20Mock;

  beforeEach(async function () {
    const [, ...signersAddr] = await ethers.getSigners();
    addrs = signersAddr;
    const erc20Address = await this.token.erc20TokenAddress();
    const erc20Factory = await ethers.getContractFactory('ERC20Mock');
    erc20 = <ERC20Mock>erc20Factory.attach(erc20Address);
  });

  it('cannot mint under price', async function () {
    const HALF_ETH = ONE_ETH / 2n;

    await erc20.mint(addrs[0].address, ONE_ETH);
    await erc20.approve(await this.token.getAddress(), HALF_ETH);
    await expect(
      this.token.mint(addrs[0].address, 1n),
    ).to.be.revertedWithCustomError(erc20, 'ERC20InsufficientAllowance');
  });

  it('cannot mint 0 units', async function () {
    await expect(
      this.token.mint(addrs[0].address, 0n),
    ).to.be.revertedWithCustomError(this.token, 'RMRKMintZero');
  });

  it('cannot mint over max supply', async function () {
    await expect(
      this.token.mint(addrs[0].address, 99999n),
    ).to.be.revertedWithCustomError(this.token, 'RMRKMintOverMax');
  });

  it('can mint tokens through sale logic', async function () {
    await mintFromErc20Pay(this.token, addrs[0].address);
    expect(await this.token.ownerOf(1)).to.equal(addrs[0].address);
    expect(await this.token.totalSupply()).to.equal(1);
    expect(await this.token.balanceOf(addrs[0].address)).to.equal(1);
  });

  it('can withdraw raised funds', async function () {
    await mintFromErc20Pay(this.token, addrs[0].address);
    const contractBalance = await erc20.balanceOf(
      await this.token.getAddress(),
    );
    const initAddressBalance = await erc20.balanceOf(addrs[0].address);
    expect(contractBalance).to.equal(ONE_ETH);
    await this.token.withdrawRaisedERC20(
      await erc20.getAddress(),
      addrs[0].address,
      contractBalance,
    );
    expect(await erc20.balanceOf(await this.token.getAddress())).to.equal(0);
    expect(await erc20.balanceOf(addrs[0].address)).to.equal(
      initAddressBalance + contractBalance,
    );
  });

  it('reduces total supply on burn', async function () {
    const tokenId = await mintFromErc20Pay(this.token, addrs[0].address);
    expect(await this.token.totalSupply()).to.equal(1);
    await this.token.connect(addrs[0])['burn(uint256)'](tokenId);
    expect(await this.token.totalSupply()).to.equal(0);
  });

  it('reduces total supply on burn and does not reuse ID', async function () {
    const tokenId = await mintFromErc20Pay(this.token, addrs[0].address);
    await this.token.connect(addrs[0])['burn(uint256)'](tokenId);

    const newTokenId = await mintFromErc20Pay(this.token, addrs[0].address);
    expect(newTokenId).to.equal(tokenId + 1n);
    expect(await this.token.totalSupply()).to.equal(1);
  });

  it('can mint multiple tokens through sale logic', async function () {
    await erc20.mint(addrs[0].address, ONE_ETH * 10n);
    await erc20
      .connect(addrs[0])
      .approve(await this.token.getAddress(), ONE_ETH * 10n);

    await this.token.connect(addrs[0]).mint(addrs[0].address, 10);
    expect(await this.token.totalSupply()).to.equal(10);
    expect(await this.token.balanceOf(addrs[0].address)).to.equal(10);

    await expect(
      this.token.connect(addrs[0]).mint(addrs[0].address, 1),
    ).to.be.revertedWithCustomError(erc20, 'ERC20InsufficientAllowance');
  });

  describe('Nest minting', async () => {
    let parentId: bigint;

    beforeEach(async function () {
      if (this.token.nestMint === undefined) {
        this.skip();
      }
      parentId = await mintFromErc20Pay(this.token, addrs[0].address);
    });

    it('can nest mint tokens through sale logic', async function () {
      const childId = await nestMintFromErc20Pay(
        this.token,
        await this.token.getAddress(),
        parentId,
      );
      expect(await this.token.ownerOf(childId)).to.equal(addrs[0].address);
      expect(await this.token.totalSupply()).to.equal(2);
    });

    it('cannot nest mint over max supply', async function () {
      await expect(
        this.token.nestMint(await this.token.getAddress(), 99999, 1),
      ).to.be.revertedWithCustomError(this.token, 'RMRKMintOverMax');
    });
  });
}
