import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { OwnableLockMock } from '../../typechain-types';

async function shouldBehaveOwnableLock(ismock: boolean) {
  let ownableLock: OwnableLockMock;

  let owner: SignerWithAddress;
  let addrs: SignerWithAddress[];

  beforeEach(async function () {
    const [signersOwner, ...signersAddr] = await ethers.getSigners();
    owner = signersOwner;
    addrs = signersAddr;

    ownableLock = this.token;
  });

  describe('Init', async () => {
    it('can get owner', async () => {
      expect(await ownableLock.owner()).to.equal(owner.address);
    });

    it('emits LockSet event when the lock is set', async () => {
      await expect(ownableLock.connect(owner).setLock()).to.emit(
        ownableLock,
        'LockSet',
      );
    });

    it('can get lock', async () => {
      expect(await ownableLock.getLock()).to.equal(false);
      await ownableLock.connect(owner).setLock();
      expect(await ownableLock.getLock()).to.equal(true);
      // Test second call of setLock
      await ownableLock.connect(owner).setLock();
      expect(await ownableLock.getLock()).to.equal(true);
    });

    it('reverts if setLock caller is not owner', async () => {
      await expect(
        ownableLock.connect(addrs[0]).setLock(),
      ).to.be.revertedWithCustomError(ownableLock, 'RMRKNotOwner');
    });

    if (ismock) {
      it('fail when locked', async () => {
        expect(await ownableLock.testLock()).to.equal(true);
        await ownableLock.connect(owner).setLock();
        await expect(
          ownableLock.connect(owner).testLock(),
        ).to.be.revertedWithCustomError(ownableLock, 'RMRKLocked');
      });
    }
  });
}

export default shouldBehaveOwnableLock;
