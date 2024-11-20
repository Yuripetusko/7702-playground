import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { RMRKImplementationBaseMock } from '../../typechain-types';

describe('Implementation Base', async () => {
  let implementation_base: RMRKImplementationBaseMock;
  let owner: SignerWithAddress;
  let addrs: SignerWithAddress[];

  async function deployMintingUtilsFixture() {
    const [signersOwner, ...signersAddrs] = await ethers.getSigners();
    const MINT = await ethers.getContractFactory('RMRKImplementationBaseMock');
    const mintingUtilsContract = <RMRKImplementationBaseMock>(
      await MINT.deploy('Name', 'SBL', 'ipfs://collection-meta', 10)
    );
    await mintingUtilsContract.waitForDeployment();

    return { mintingUtilsContract, signersOwner, signersAddrs };
  }

  beforeEach(async () => {
    const { mintingUtilsContract, signersOwner, signersAddrs } =
      await loadFixture(deployMintingUtilsFixture);
    implementation_base = mintingUtilsContract;
    owner = signersOwner;
    addrs = signersAddrs;
  });

  it('can get total supply, max supply and price', async () => {
    await implementation_base.connect(owner).mockMint(5);
    expect(await implementation_base.totalSupply()).to.equal(5);
    expect(await implementation_base.maxSupply()).to.equal(10);
  });

  it('can transfer ownership', async () => {
    const newOwner = addrs[1];
    await implementation_base
      .connect(owner)
      .transferOwnership(newOwner.address);
    expect(await implementation_base.owner()).to.eql(newOwner.address);
  });

  it('emits OwnershipTransferred event when transferring ownership', async () => {
    const newOwner = addrs[1];
    await expect(
      implementation_base.connect(owner).transferOwnership(newOwner.address),
    )
      .to.emit(implementation_base, 'OwnershipTransferred')
      .withArgs(owner.address, newOwner.address);
  });

  it('cannot transfer ownership to address 0', async () => {
    await expect(
      implementation_base.connect(owner).transferOwnership(ethers.ZeroAddress),
    ).to.be.revertedWithCustomError(
      implementation_base,
      'RMRKNewOwnerIsZeroAddress',
    );
  });

  it('can renounce ownership', async () => {
    await implementation_base.connect(owner).renounceOwnership();
    expect(await implementation_base.owner()).to.eql(ethers.ZeroAddress);
  });

  it('can add and revoke contributor', async () => {
    const contributor = addrs[1];
    await implementation_base
      .connect(owner)
      .manageContributor(contributor.address, true);
    expect(
      await implementation_base
        .connect(owner)
        .isContributor(contributor.address),
    ).to.eql(true);
    await implementation_base
      .connect(owner)
      .manageContributor(contributor.address, false);
    expect(
      await implementation_base
        .connect(owner)
        .isContributor(contributor.address),
    ).to.eql(false);
  });

  it('emits ContributorUpdate when adding a contributor', async () => {
    const contributor = addrs[1];
    await expect(
      implementation_base
        .connect(owner)
        .manageContributor(contributor.address, true),
    )
      .to.emit(implementation_base, 'ContributorUpdate')
      .withArgs(contributor.address, true);
  });

  it('emits ContributorUpdate when removing a contributor', async () => {
    const contributor = addrs[1];
    await implementation_base
      .connect(owner)
      .manageContributor(contributor.address, true);
    await expect(
      implementation_base
        .connect(owner)
        .manageContributor(contributor.address, false),
    )
      .to.emit(implementation_base, 'ContributorUpdate')
      .withArgs(contributor.address, false);
  });

  it('cannot add zero address as contributor', async () => {
    await expect(
      implementation_base
        .connect(owner)
        .manageContributor(ethers.ZeroAddress, true),
    ).to.be.revertedWithCustomError(
      implementation_base,
      'RMRKNewContributorIsZeroAddress',
    );
  });

  it('cannot do owner operations if not owner', async () => {
    const notOwner = addrs[1];
    const otherUser = addrs[2];
    await expect(
      implementation_base
        .connect(notOwner)
        .transferOwnership(await otherUser.getAddress()),
    ).to.be.revertedWithCustomError(implementation_base, 'RMRKNotOwner');
    await expect(
      implementation_base.connect(notOwner).renounceOwnership(),
    ).to.be.revertedWithCustomError(implementation_base, 'RMRKNotOwner');
    await expect(
      implementation_base
        .connect(notOwner)
        .manageContributor(await otherUser.getAddress(), true),
    ).to.be.revertedWithCustomError(implementation_base, 'RMRKNotOwner');
    await expect(
      implementation_base
        .connect(notOwner)
        .manageContributor(await otherUser.getAddress(), false),
    ).to.be.revertedWithCustomError(implementation_base, 'RMRKNotOwner');
  });
});
