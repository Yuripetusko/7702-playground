import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { ChildAdder, RMRKNestableMock } from '../typechain-types';

async function nestableFixture() {
  const NestableFactory = await ethers.getContractFactory('RMRKNestableMock');
  const parent = <RMRKNestableMock>await NestableFactory.deploy();
  await parent.waitForDeployment();

  return parent;
}

describe('Nestable with ChildAdder', () => {
  let parent: RMRKNestableMock;
  let adder: ChildAdder;
  let owner: SignerWithAddress;

  beforeEach(async () => {
    owner = (await ethers.getSigners())[0];
    parent = await loadFixture(nestableFixture);
    const Childadder = await ethers.getContractFactory('ChildAdder');
    adder = <ChildAdder>await Childadder.deploy();
    await adder.waitForDeployment();
  });

  describe('add children', async () => {
    it('cannot add multiple children', async () => {
      await parent.connect(owner).mint(owner.address, 1);
      // Propose 10 children with the same params to the parent token
      await adder.addChild(await parent.getAddress(), 1, 1, 10);

      await parent
        .connect(owner)
        .acceptChild(1, 0, await adder.getAddress(), 1);
      await expect(
        parent.connect(owner).acceptChild(1, 0, await adder.getAddress(), 1),
      ).to.be.revertedWithCustomError(parent, 'RMRKChildAlreadyExists');
    });
  });
});
