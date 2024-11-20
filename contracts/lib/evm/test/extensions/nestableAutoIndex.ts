import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { RMRKNestableAutoIndexMock } from '../../typechain-types';
import {
  IERC165,
  IERC7401,
  IOtherInterface,
  IRMRKNestableAutoIndex,
} from '../interfaces';
import { bn } from '../utils';

// --------------- FIXTURES -----------------------

async function nestableAutoIndexFixture() {
  const factory = await ethers.getContractFactory('RMRKNestableAutoIndexMock');
  const token = await factory.deploy();
  await token.waitForDeployment();

  return token;
}

describe('RMRKNestableAutoIndexMock', async () => {
  let token: RMRKNestableAutoIndexMock;
  let owner: SignerWithAddress;
  const parentId = bn(1);
  const childId1 = bn(11);
  const childId2 = bn(12);
  const childId3 = bn(13);

  beforeEach(async () => {
    [owner] = await ethers.getSigners();
    token = await loadFixture(nestableAutoIndexFixture);
  });

  it('can support IERC165', async () => {
    expect(await token.supportsInterface(IERC165)).to.equal(true);
  });

  it('can support IERC7401', async () => {
    expect(await token.supportsInterface(IERC7401)).to.equal(true);
  });

  it('can support IRMRKNestableAutoIndex', async () => {
    expect(await token.supportsInterface(IRMRKNestableAutoIndex)).to.equal(
      true,
    );
  });

  it('does not support other interfaces', async () => {
    expect(await token.supportsInterface(IOtherInterface)).to.equal(false);
  });

  describe('With minted tokens', async () => {
    beforeEach(async () => {
      await token.mint(owner.address, parentId);
      await token.nestMint(await token.getAddress(), childId1, parentId);
      await token.nestMint(await token.getAddress(), childId2, parentId);
      await token.nestMint(await token.getAddress(), childId3, parentId);
    });

    it('can accept child in first position and result is ok', async () => {
      await token['acceptChild(uint256,address,uint256)'](
        parentId,
        await token.getAddress(),
        childId1,
      );
      expect(await token.pendingChildrenOf(parentId)).to.eql([
        [childId3, await token.getAddress()],
        [childId2, await token.getAddress()],
      ]);
      expect(await token.childrenOf(parentId)).to.eql([
        [childId1, await token.getAddress()],
      ]);
    });

    it('can accept child in middle position and result is ok', async () => {
      await token['acceptChild(uint256,address,uint256)'](
        parentId,
        await token.getAddress(),
        childId2,
      );
      expect(await token.pendingChildrenOf(parentId)).to.eql([
        [childId1, await token.getAddress()],
        [childId3, await token.getAddress()],
      ]);
      expect(await token.childrenOf(parentId)).to.eql([
        [childId2, await token.getAddress()],
      ]);
    });

    it('can accept child in last position and result is ok', async () => {
      await token['acceptChild(uint256,address,uint256)'](
        parentId,
        await token.getAddress(),
        childId3,
      );
      expect(await token.pendingChildrenOf(parentId)).to.eql([
        [childId1, await token.getAddress()],
        [childId2, await token.getAddress()],
      ]);
      expect(await token.childrenOf(parentId)).to.eql([
        [childId3, await token.getAddress()],
      ]);
    });

    it('cannot accept not existing pending child', async () => {
      const otherChildId = bn(4);
      await expect(
        token['acceptChild(uint256,address,uint256)'](
          parentId,
          await token.getAddress(),
          otherChildId,
        ),
      ).to.be.revertedWithCustomError(token, 'RMRKUnexpectedChildId');
    });

    describe('With pending tokens tokens', async () => {
      it('can transfer pending child in first position and result is ok', async () => {
        await token[
          'transferChild(uint256,address,uint256,address,uint256,bool,bytes)'
        ](
          parentId,
          owner.address,
          0,
          await token.getAddress(),
          childId1,
          true,
          '0x',
        );
        expect(await token.pendingChildrenOf(parentId)).to.eql([
          [childId3, await token.getAddress()],
          [childId2, await token.getAddress()],
        ]);
      });

      it('can transfer pending child in middle position and result is ok', async () => {
        await token[
          'transferChild(uint256,address,uint256,address,uint256,bool,bytes)'
        ](
          parentId,
          owner.address,
          0,
          await token.getAddress(),
          childId2,
          true,
          '0x',
        );
        expect(await token.pendingChildrenOf(parentId)).to.eql([
          [childId1, await token.getAddress()],
          [childId3, await token.getAddress()],
        ]);
      });

      it('can transfer pending child in last position and result is ok', async () => {
        await token[
          'transferChild(uint256,address,uint256,address,uint256,bool,bytes)'
        ](
          parentId,
          owner.address,
          0,
          await token.getAddress(),
          childId3,
          true,
          '0x',
        );
        expect(await token.pendingChildrenOf(parentId)).to.eql([
          [childId1, await token.getAddress()],
          [childId2, await token.getAddress()],
        ]);
      });

      it('can transfer all pending children result is ok', async () => {
        await token[
          'transferChild(uint256,address,uint256,address,uint256,bool,bytes)'
        ](
          parentId,
          owner.address,
          0,
          await token.getAddress(),
          childId1,
          true,
          '0x',
        );
        await token[
          'transferChild(uint256,address,uint256,address,uint256,bool,bytes)'
        ](
          parentId,
          owner.address,
          0,
          await token.getAddress(),
          childId2,
          true,
          '0x',
        );
        await token[
          'transferChild(uint256,address,uint256,address,uint256,bool,bytes)'
        ](
          parentId,
          owner.address,
          0,
          await token.getAddress(),
          childId3,
          true,
          '0x',
        );
        expect(await token.pendingChildrenOf(parentId)).to.eql([]);
        expect(await token.childrenOf(parentId)).to.eql([]);
      });

      it('cannot transfer not existing pending child', async () => {
        const otherChildId = bn(4);
        await expect(
          token[
            'transferChild(uint256,address,uint256,address,uint256,bool,bytes)'
          ](
            parentId,
            owner.address,
            0,
            await token.getAddress(),
            otherChildId,
            true,
            '0x',
          ),
        ).to.be.revertedWithCustomError(token, 'RMRKUnexpectedChildId');
      });
    });

    describe('With accepted tokens', async () => {
      beforeEach(async () => {
        await token['acceptChild(uint256,address,uint256)'](
          parentId,
          await token.getAddress(),
          childId1,
        );
        await token['acceptChild(uint256,address,uint256)'](
          parentId,
          await token.getAddress(),
          childId2,
        );
        await token['acceptChild(uint256,address,uint256)'](
          parentId,
          await token.getAddress(),
          childId3,
        );
      });

      it('can transfer active child in first position and result is ok', async () => {
        await token[
          'transferChild(uint256,address,uint256,address,uint256,bool,bytes)'
        ](
          parentId,
          owner.address,
          0,
          await token.getAddress(),
          childId1,
          false,
          '0x',
        );
        expect(await token.childrenOf(parentId)).to.eql([
          [childId3, await token.getAddress()],
          [childId2, await token.getAddress()],
        ]);
      });

      it('can transfer active child in middle position and result is ok', async () => {
        await token[
          'transferChild(uint256,address,uint256,address,uint256,bool,bytes)'
        ](
          parentId,
          owner.address,
          0,
          await token.getAddress(),
          childId2,
          false,
          '0x',
        );
        expect(await token.childrenOf(parentId)).to.eql([
          [childId1, await token.getAddress()],
          [childId3, await token.getAddress()],
        ]);
      });

      it('can transfer active child in last position and result is ok', async () => {
        await token[
          'transferChild(uint256,address,uint256,address,uint256,bool,bytes)'
        ](
          parentId,
          owner.address,
          0,
          await token.getAddress(),
          childId3,
          false,
          '0x',
        );
        expect(await token.childrenOf(parentId)).to.eql([
          [childId1, await token.getAddress()],
          [childId2, await token.getAddress()],
        ]);
      });

      it('can transfer all active children result is ok', async () => {
        await token[
          'transferChild(uint256,address,uint256,address,uint256,bool,bytes)'
        ](
          parentId,
          owner.address,
          0,
          await token.getAddress(),
          childId1,
          false,
          '0x',
        );
        await token[
          'transferChild(uint256,address,uint256,address,uint256,bool,bytes)'
        ](
          parentId,
          owner.address,
          0,
          await token.getAddress(),
          childId2,
          false,
          '0x',
        );
        await token[
          'transferChild(uint256,address,uint256,address,uint256,bool,bytes)'
        ](
          parentId,
          owner.address,
          0,
          await token.getAddress(),
          childId3,
          false,
          '0x',
        );
        expect(await token.pendingChildrenOf(parentId)).to.eql([]);
        expect(await token.childrenOf(parentId)).to.eql([]);
      });

      it('cannot transfer not existing active child', async () => {
        const otherChildId = bn(4);
        await expect(
          token[
            'transferChild(uint256,address,uint256,address,uint256,bool,bytes)'
          ](
            parentId,
            owner.address,
            0,
            await token.getAddress(),
            otherChildId,
            false,
            '0x',
          ),
        ).to.be.revertedWithCustomError(token, 'RMRKUnexpectedChildId');
      });
    });
  });
});
