import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { IERC165, IERC5773, IOtherInterface } from '../interfaces';
import {
  GenericEquippable,
  GenericMintable,
  GenericMultiAsset,
  addAssetToToken,
  bn,
} from '../utils';

async function shouldBehaveLikeMultiAsset<
  T extends GenericMintable = GenericMintable,
>(
  mint: (token: T, to: string) => Promise<bigint>,
  addAssetEntryFunc: (token: T, data?: string) => Promise<bigint>,
  addAssetToTokenFunc: typeof addAssetToToken,
) {
  let tokenId: bigint;
  let tokenOwner: SignerWithAddress;
  let approved: SignerWithAddress;
  let operator: SignerWithAddress;
  let notApproved: SignerWithAddress;

  before(async () => {
    const [, ...signersAddr] = await ethers.getSigners();
    tokenOwner = signersAddr[0];
    approved = signersAddr[1];
    operator = signersAddr[2];
    notApproved = signersAddr[3];
  });

  describe('Interface support', async () => {
    it('can support IERC165', async function () {
      expect(await this.token.supportsInterface(IERC165)).to.equal(true);
    });

    it('can support IMultiAsset', async function () {
      expect(await this.token.supportsInterface(IERC5773)).to.equal(true);
    });

    it('cannot support other interfaceId', async function () {
      expect(await this.token.supportsInterface(IOtherInterface)).to.equal(
        false,
      );
    });
  });

  describe('With minted token', async () => {
    beforeEach(async function () {
      tokenId = await mint(this.token, tokenOwner.address);
    });

    describe('Add asset', async () => {
      it('can add asset to token', async function () {
        const resId = await addAssetEntryFunc(this.token);
        await expect(addAssetToTokenFunc(this.token, tokenId, resId, 0))
          .to.emit(this.token, 'AssetAddedToTokens')
          .withArgs([tokenId], resId, 0);
      });

      it('cannot add non existing asset to token', async function () {
        const badResId = bn(10);
        await expect(
          addAssetToTokenFunc(this.token, tokenId, badResId, 0),
        ).to.be.revertedWithCustomError(this.token, 'RMRKNoAssetMatchingId');
      });
    });

    describe('Approvals', async () => {
      it('can approve address for assets', async function () {
        await this.token
          .connect(tokenOwner)
          .approveForAssets(approved.address, tokenId);
        expect(await this.token.getApprovedForAssets(tokenId)).to.eql(
          approved.address,
        );
      });

      it('can approve address for all for assets', async function () {
        await this.token
          .connect(tokenOwner)
          .setApprovalForAllForAssets(await operator.getAddress(), true);
        expect(
          await this.token.isApprovedForAllForAssets(
            tokenOwner.address,
            await operator.getAddress(),
          ),
        ).to.eql(true);

        await this.token
          .connect(tokenOwner)
          .setApprovalForAllForAssets(await operator.getAddress(), false);
        expect(
          await this.token.isApprovedForAllForAssets(
            tokenOwner.address,
            await operator.getAddress(),
          ),
        ).to.eql(false);
      });

      it('cannot approve owner for assets', async function () {
        await expect(
          this.token
            .connect(tokenOwner)
            .approveForAssets(tokenOwner.address, tokenId),
        ).to.be.revertedWithCustomError(
          this.token,
          'RMRKApprovalForAssetsToCurrentOwner',
        );
      });

      it('cannot approve owner for all assets', async function () {
        await expect(
          this.token
            .connect(tokenOwner)
            .setApprovalForAllForAssets(tokenOwner.address, true),
        ).to.be.revertedWithCustomError(
          this.token,
          'RMRKApprovalForAssetsToCurrentOwner',
        );
      });

      it('cannot approve owner if not owner', async function () {
        await expect(
          this.token
            .connect(notApproved)
            .approveForAssets(approved.address, tokenId),
        ).to.be.revertedWithCustomError(
          this.token,
          'RMRKApproveForAssetsCallerIsNotOwnerNorApprovedForAll',
        );
      });

      it('can approve address for assets if approved for all assets', async function () {
        await this.token
          .connect(tokenOwner)
          .setApprovalForAllForAssets(await operator.getAddress(), true);
        await this.token
          .connect(operator)
          .approveForAssets(approved.address, tokenId);
        expect(await this.token.getApprovedForAssets(tokenId)).to.eql(
          approved.address,
        );
      });
    });

    describe('Replacing assets', async () => {
      it('can add asset to token replacing an existing one', async function () {
        const resId = await addAssetEntryFunc(this.token);
        const resId2 = await addAssetEntryFunc(this.token);
        const resId3 = await addAssetEntryFunc(this.token);
        await addAssetToTokenFunc(this.token, tokenId, resId, 0);
        await addAssetToTokenFunc(this.token, tokenId, resId2, 0);
        await this.token.connect(tokenOwner).acceptAsset(tokenId, 0, resId);
        await this.token.connect(tokenOwner).acceptAsset(tokenId, 0, resId2);

        // Add new asset to replace the first, and accept
        await expect(this.token.addAssetToToken(tokenId, resId3, resId2))
          .to.emit(this.token, 'AssetAddedToTokens')
          .withArgs([tokenId], resId3, resId2);

        expect(await this.token.getAssetReplacements(tokenId, resId3)).to.eql(
          resId2,
        );
        await expect(
          this.token.connect(tokenOwner).acceptAsset(tokenId, 0, resId3),
        )
          .to.emit(this.token, 'AssetAccepted')
          .withArgs(tokenId, resId3, resId2);

        expect(await this.token.getActiveAssets(tokenId)).to.be.eql([
          resId,
          resId3,
        ]);
        expect(await this.token.getActiveAssetPriorities(tokenId)).to.be.eql([
          0n,
          bn(1),
        ]);

        // Replacements should be gone
        expect(await this.token.getAssetReplacements(tokenId, resId3)).to.eql(
          0n,
        );
      });

      it('can replace non existing asset to token, it could have been deleted', async function () {
        const resId = await addAssetEntryFunc(this.token);

        await addAssetToTokenFunc(this.token, tokenId, resId, 1);
        await this.token.connect(tokenOwner).acceptAsset(tokenId, 0, resId);

        expect(await this.token.getActiveAssets(tokenId)).to.be.eql([resId]);
        expect(await this.token.getActiveAssetPriorities(tokenId)).to.be.eql([
          0n,
        ]);
      });

      it('can reject asset and replacements are cleared', async function () {
        const resId = await addAssetEntryFunc(this.token);
        await addAssetToTokenFunc(this.token, tokenId, resId, 0);
        await this.token.connect(tokenOwner).acceptAsset(tokenId, 0, resId);

        const resId2 = await addAssetEntryFunc(this.token);
        await addAssetToTokenFunc(this.token, tokenId, resId2, resId);
        await this.token.connect(tokenOwner).rejectAsset(tokenId, 0, resId2);

        expect(await this.token.getAssetReplacements(tokenId, resId2)).to.eql(
          0n,
        );
      });

      it('can reject all assets and replacements are cleared', async function () {
        const resId = await addAssetEntryFunc(this.token);
        await addAssetToTokenFunc(this.token, tokenId, resId, 0);
        await this.token.connect(tokenOwner).acceptAsset(tokenId, 0, resId);

        const resId2 = await addAssetEntryFunc(this.token);
        await addAssetToTokenFunc(this.token, tokenId, resId2, resId);
        await this.token.connect(tokenOwner).rejectAllAssets(tokenId, 1);

        expect(await this.token.getAssetReplacements(tokenId, resId2)).to.eql(
          0n,
        );
      });
    });
  });

  describe('With minted token and 2 pending assets', async () => {
    const resData1 = 'data1';
    const resData2 = 'data2';
    let resId1: bigint;
    let resId2: bigint;

    beforeEach(async function () {
      // Mint and add 2 assets to token
      tokenId = await mint(this.token, tokenOwner.address);
      resId1 = await addAssetEntryFunc(this.token, resData1);
      resId2 = await addAssetEntryFunc(this.token, resData2);
      await addAssetToTokenFunc(this.token, tokenId, resId1, 0);
      await addAssetToTokenFunc(this.token, tokenId, resId2, 0);
    });

    describe('Accepting assets', async () => {
      it('can accept asset', async function () {
        expect(
          await this.renderUtils.getPendingAssets(
            await this.token.getAddress(),
            tokenId,
          ),
        ).to.eql([
          [resId1, 0n, 0n, resData1],
          [resId2, bn(1), 0n, resData2],
        ]);

        await expect(
          this.token.connect(tokenOwner).acceptAsset(tokenId, 0, resId1),
        )
          .to.emit(this.token, 'AssetAccepted')
          .withArgs(tokenId, resId1, 0);

        expect(
          await this.renderUtils.getPendingAssets(
            await this.token.getAddress(),
            tokenId,
          ),
        ).to.eql([[resId2, 0n, 0n, resData2]]);
        expect(await this.token.getActiveAssets(tokenId)).to.be.eql([resId1]);
        expect(await this.token.getAssetMetadata(tokenId, resId1)).equal(
          resData1,
        );
      });

      it('can accept multiple assets', async function () {
        await expect(
          this.token.connect(tokenOwner).acceptAsset(tokenId, 1, resId2),
        )
          .to.emit(this.token, 'AssetAccepted')
          .withArgs(tokenId, resId2, 0);
        await expect(
          this.token.connect(tokenOwner).acceptAsset(tokenId, 0, resId1),
        )
          .to.emit(this.token, 'AssetAccepted')
          .withArgs(tokenId, resId1, 0);

        expect(await this.token.getPendingAssets(tokenId)).to.be.eql([]);
        expect(await this.token.getActiveAssets(tokenId)).to.be.eql([
          resId2,
          resId1,
        ]);
      });

      it('can accept asset if approved', async function () {
        await this.token
          .connect(tokenOwner)
          .approveForAssets(approved.address, tokenId);
        await this.token.connect(approved).acceptAsset(tokenId, 0, resId1);

        expect(await this.token.getActiveAssets(tokenId)).to.be.eql([resId1]);
      });

      it('can accept asset if approved for all', async function () {
        await this.token
          .connect(tokenOwner)
          .setApprovalForAllForAssets(await operator.getAddress(), true);
        await this.token.connect(operator).acceptAsset(tokenId, 0, resId1);

        expect(await this.token.getActiveAssets(tokenId)).to.be.eql([resId1]);
      });

      it('cannot accept more assets than there are', async function () {
        // Trying to accept over pending size
        await expect(
          this.token.connect(tokenOwner).acceptAsset(tokenId, 3, resId1),
        ).to.be.revertedWithCustomError(this.token, 'RMRKIndexOutOfRange');

        // Accepts 2 pending
        await this.token.connect(tokenOwner).acceptAsset(tokenId, 0, resId1);
        await this.token.connect(tokenOwner).acceptAsset(tokenId, 0, resId2);

        // Nothing more to accept, even on index 0
        await expect(
          this.token.connect(tokenOwner).acceptAsset(tokenId, 0, resId1),
        ).to.be.revertedWithCustomError(this.token, 'RMRKIndexOutOfRange');
      });

      it('cannot accept if id does not match', async function () {
        // It's resId1 which is on index 0
        await expect(
          this.token.connect(tokenOwner).acceptAsset(tokenId, 0, resId2),
        ).to.be.revertedWithCustomError(this.token, 'RMRKUnexpectedAssetId');
      });

      it('cannot accept asset if not owner or approved', async function () {
        await expect(
          this.token.connect(notApproved).acceptAsset(tokenId, 0, resId1),
        ).to.be.revertedWithCustomError(
          this.token,
          'RMRKNotApprovedForAssetsOrOwner',
        );
      });
    });

    describe('Rejecting assets', async () => {
      it('can reject asset', async function () {
        expect(await this.token.getPendingAssets(tokenId)).to.eql([
          resId1,
          resId2,
        ]);
        await expect(
          this.token.connect(tokenOwner).rejectAsset(tokenId, 0, resId1),
        )
          .to.emit(this.token, 'AssetRejected')
          .withArgs(tokenId, resId1);

        expect(await this.token.getActiveAssets(tokenId)).to.be.eql([]);
        expect(await this.token.getPendingAssets(tokenId)).to.eql([resId2]);
      });

      it('can reject asset if approved', async function () {
        await this.token
          .connect(tokenOwner)
          .approveForAssets(approved.address, tokenId);
        await this.token.connect(approved).rejectAsset(tokenId, 0, resId1);

        expect(await this.token.getActiveAssets(tokenId)).to.be.eql([]);
        expect(await this.token.getPendingAssets(tokenId)).to.eql([resId2]);
      });

      it('can reject asset if approved for all', async function () {
        await this.token
          .connect(tokenOwner)
          .setApprovalForAllForAssets(await operator.getAddress(), true);
        await this.token.connect(operator).rejectAsset(tokenId, 0, resId1);

        expect(await this.token.getActiveAssets(tokenId)).to.be.eql([]);
        expect(await this.token.getPendingAssets(tokenId)).to.eql([resId2]);
      });

      it('can reject all assets', async function () {
        await expect(this.token.connect(tokenOwner).rejectAllAssets(tokenId, 2))
          .to.emit(this.token, 'AssetRejected')
          .withArgs(tokenId, 0);

        expect(await this.token.getActiveAssets(tokenId)).to.be.eql([]);
        expect(await this.token.getPendingAssets(tokenId)).to.eql([]);
      });

      it('can reject all assets if approved', async function () {
        await this.token
          .connect(tokenOwner)
          .approveForAssets(approved.address, tokenId);
        await this.token.connect(approved).rejectAllAssets(tokenId, 2);

        expect(await this.token.getActiveAssets(tokenId)).to.be.eql([]);
        expect(await this.token.getPendingAssets(tokenId)).to.eql([]);
      });

      it('can reject all assets if approved for all', async function () {
        await this.token
          .connect(tokenOwner)
          .setApprovalForAllForAssets(await operator.getAddress(), true);
        await this.token.connect(operator).rejectAllAssets(tokenId, 2);

        expect(await this.token.getActiveAssets(tokenId)).to.be.eql([]);
        expect(await this.token.getPendingAssets(tokenId)).to.eql([]);
      });

      it('cannot reject more assets than there are', async function () {
        // Trying to accept over pending size
        await expect(
          this.token.connect(tokenOwner).rejectAsset(tokenId, 3, resId1),
        ).to.be.revertedWithCustomError(this.token, 'RMRKIndexOutOfRange');

        // Rejects 2 pending
        await this.token.connect(tokenOwner).rejectAsset(tokenId, 0, resId1);
        await this.token.connect(tokenOwner).rejectAsset(tokenId, 0, resId2);

        // Nothing more to reject, even on index 0
        await expect(
          this.token.connect(tokenOwner).rejectAsset(tokenId, 0, resId1),
        ).to.be.revertedWithCustomError(this.token, 'RMRKIndexOutOfRange');
      });

      it('cannot reject asset if id does not match', async function () {
        // It's resId1 which is on index 0
        await expect(
          this.token.connect(tokenOwner).rejectAsset(tokenId, 0, resId2),
        ).to.be.revertedWithCustomError(this.token, 'RMRKUnexpectedAssetId');
      });

      it('cannot reject all assets if quantity does not match', async function () {
        // There are 2 pending assets
        await expect(
          this.token.connect(tokenOwner).rejectAllAssets(tokenId, 1),
        ).to.be.revertedWithCustomError(
          this.token,
          'RMRKUnexpectedNumberOfAssets',
        );
      });

      it('cannot reject asset nor reject all if not owner', async function () {
        await expect(
          this.token.connect(notApproved).rejectAsset(tokenId, 0, resId1),
        ).to.be.revertedWithCustomError(
          this.token,
          'RMRKNotApprovedForAssetsOrOwner',
        );
        await expect(
          this.token.connect(notApproved).rejectAllAssets(tokenId, 1),
        ).to.be.revertedWithCustomError(
          this.token,
          'RMRKNotApprovedForAssetsOrOwner',
        );
      });
    });

    describe('With minted token and 2 accepted assets', async () => {
      beforeEach(async function () {
        await this.token.connect(tokenOwner).acceptAsset(tokenId, 0, resId1);
        await this.token.connect(tokenOwner).acceptAsset(tokenId, 0, resId2);
      });

      describe('Priorities', async () => {
        it('can set and get priorities', async function () {
          expect(await this.token.getActiveAssetPriorities(tokenId)).to.be.eql([
            0n,
            bn(1),
          ]);

          await expect(
            this.token.connect(tokenOwner).setPriority(tokenId, [1, 0]),
          )
            .to.emit(this.token, 'AssetPrioritySet')
            .withArgs(tokenId);
          expect(await this.token.getActiveAssetPriorities(tokenId)).to.be.eql([
            bn(1),
            0n,
          ]);
        });

        it('can set and get priorities if approved', async function () {
          await this.token
            .connect(tokenOwner)
            .approveForAssets(approved.address, tokenId);

          await expect(
            this.token.connect(approved).setPriority(tokenId, [1, 0]),
          )
            .to.emit(this.token, 'AssetPrioritySet')
            .withArgs(tokenId);
          expect(await this.token.getActiveAssetPriorities(tokenId)).to.be.eql([
            bn(1),
            0n,
          ]);
        });

        it('can set and get priorities if approved for all', async function () {
          await this.token
            .connect(tokenOwner)
            .setApprovalForAllForAssets(await operator.getAddress(), true);

          expect(await this.token.getActiveAssetPriorities(tokenId)).to.be.eql([
            0n,
            bn(1),
          ]);
          await expect(
            this.token.connect(operator).setPriority(tokenId, [1, 0]),
          )
            .to.emit(this.token, 'AssetPrioritySet')
            .withArgs(tokenId);
          expect(await this.token.getActiveAssetPriorities(tokenId)).to.be.eql([
            bn(1),
            0n,
          ]);
        });

        it('cannot set priorities for non owned token', async function () {
          await expect(
            this.token.connect(notApproved).setPriority(tokenId, [1, 0]),
          ).to.be.revertedWithCustomError(
            this.token,
            'RMRKNotApprovedForAssetsOrOwner',
          );
        });

        it('cannot set different number of priorities', async function () {
          await expect(
            this.token.connect(tokenOwner).setPriority(tokenId, [1]),
          ).to.be.revertedWithCustomError(
            this.token,
            'RMRKBadPriorityListLength',
          );
          await expect(
            this.token.connect(tokenOwner).setPriority(tokenId, [1, 0, 2]),
          ).to.be.revertedWithCustomError(
            this.token,
            'RMRKBadPriorityListLength',
          );
        });

        it('cannot set priorities for non existing token', async function () {
          const badTokenId = 99;
          await expect(
            this.token.connect(tokenOwner).setPriority(badTokenId, []),
          ).to.be.reverted;
        });
      });
    });
  });
}

export default shouldBehaveLikeMultiAsset;
