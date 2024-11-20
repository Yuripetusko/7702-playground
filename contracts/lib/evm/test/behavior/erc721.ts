import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { Contract, ContractTransaction } from 'ethers';
import { ethers } from 'hardhat';
import {
  ERC721ReceiverMock,
  RMRKNestableLazyMintErc20,
} from '../../typechain-types';
import { GenericSafeTransferable, GenericTransferable, bn } from '../utils';

// Based on https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/test/token/ERC721/ERC721.behavior.js

async function shouldBehaveLikeERC721(name: string, symbol: string) {
  let owner: SignerWithAddress;
  let approved: SignerWithAddress;
  let anotherApproved: SignerWithAddress;
  let operator: SignerWithAddress;
  let toWhom: SignerWithAddress | ERC721ReceiverMock;
  let others: SignerWithAddress[];
  let receipt: ContractTransaction;
  let receiver: ERC721ReceiverMock;

  const firstTokenId = bn(5042);
  const secondTokenId = bn(79217);
  const nonExistentTokenId = bn(13);
  const fourthTokenId = bn(4);
  const RECEIVER_MAGIC_VALUE = '0x150b7a02';

  enum Error {
    None = 0,
    RevertWithMessage = 1,
    RevertWithoutMessage = 2,
    Panic = 3,
  }

  context('with minted tokens', () => {
    beforeEach(async function () {
      [owner, approved, anotherApproved, operator, ...others] =
        await ethers.getSigners();

      await this.token['mint(address,uint256)'](owner.address, firstTokenId);
      await this.token['mint(address,uint256)'](owner.address, secondTokenId);
      toWhom = others[0]; // default to other for toWhom in context-dependent tests
    });

    describe('metadata', () => {
      describe('token URI', () => {
        it.skip('reverts when queried for non existent token id', async function () {
          await expect(
            this.token.tokenURI(nonExistentTokenId),
          ).to.be.revertedWithCustomError(this.token, 'ERC721InvalidTokenId');
        });
      });
    });

    describe('balanceOf', () => {
      context('when the given address owns some tokens', () => {
        it('returns the amount of tokens owned by the given address', async function () {
          expect(await this.token.balanceOf(owner.address)).to.eql(bn(2));
        });
      });

      context('when the given address does not own any tokens', () => {
        it('returns 0', async function () {
          expect(await this.token.balanceOf(others[0].address)).to.eql(0n);
        });
      });

      context('when querying the zero address', () => {
        it('throws', async function () {
          await expect(
            this.token.balanceOf(ethers.ZeroAddress),
          ).to.be.revertedWithCustomError(
            this.token,
            'ERC721AddressZeroIsNotaValidOwner',
          );
        });
      });
    });

    describe('ownerOf', () => {
      context('when the given token ID was tracked by this token', () => {
        const tokenId = firstTokenId;

        it('returns the owner of the given token ID', async function () {
          expect(await this.token.ownerOf(tokenId)).to.be.equal(owner.address);
        });
      });

      context('when the given token ID was not tracked by this token', () => {
        const tokenId = nonExistentTokenId;

        it('reverts', async function () {
          await expect(
            this.token.ownerOf(tokenId),
          ).to.be.revertedWithCustomError(this.token, 'ERC721InvalidTokenId');
        });
      });
    });

    describe('transfers', () => {
      const tokenId = firstTokenId;
      const data = '0x42';

      beforeEach(async function () {
        await this.token.approve(approved.address, tokenId);
        await this.token.setApprovalForAll(await operator.getAddress(), true);
      });

      const transferWasSuccessful = (
        owner: SignerWithAddress,
        tokenId: bigint,
      ) => {
        it('transfers the ownership of the given token ID to the given address', async function () {
          expect(await this.token.ownerOf(tokenId)).to.be.equal(
            await toWhom.getAddress(),
          );
        });

        it('emits a Transfer event', async function () {
          await expect(receipt)
            .to.emit(this.token, 'Transfer')
            .withArgs(owner.address, await toWhom.getAddress(), tokenId);
        });

        it('clears the approval for the token ID', async function () {
          expect(await this.token.getApproved(tokenId)).to.be.equal(
            ethers.ZeroAddress,
          );
        });

        it('adjusts owners balances', async function () {
          expect(await this.token.balanceOf(owner.address)).to.eql(bn(1));
        });
      };

      const shouldTransferTokensByUsers = (transferFunction: any) => {
        context('when called by the owner', () => {
          beforeEach(async function () {
            receipt = await transferFunction(
              this.token,
              owner.address,
              await toWhom.getAddress(),
              tokenId,
              owner,
            );
          });
          afterEach(async () => {
            transferWasSuccessful(owner, tokenId);
          });
        });

        context('when called by the approved individual', () => {
          beforeEach(async function () {
            receipt = await transferFunction(
              this.token,
              owner.address,
              await toWhom.getAddress(),
              tokenId,
              approved,
            );
          });
          afterEach(async () => {
            transferWasSuccessful(owner, tokenId);
          });
        });

        context('when called by the operator', () => {
          beforeEach(async function () {
            receipt = await transferFunction(
              this.token,
              owner.address,
              await toWhom.getAddress(),
              tokenId,
              operator,
            );
          });
          afterEach(async () => {
            transferWasSuccessful(owner, tokenId);
          });
        });

        context('when called by the owner without an approved user', () => {
          beforeEach(async function () {
            await this.token.approve(ethers.ZeroAddress, tokenId);
            receipt = await transferFunction(
              this.token,
              owner.address,
              await toWhom.getAddress(),
              tokenId,
              operator,
            );
          });
          afterEach(async () => {
            transferWasSuccessful(owner, tokenId);
          });
        });

        context('when sent to the owner', () => {
          beforeEach(async function () {
            receipt = await transferFunction(
              this.token,
              owner.address,
              owner.address,
              tokenId,
              owner,
            );
          });

          it('keeps ownership of the token', async function () {
            expect(await this.token.ownerOf(tokenId)).to.be.equal(
              owner.address,
            );
          });

          it('clears the approval for the token ID', async function () {
            expect(await this.token.getApproved(tokenId)).to.be.equal(
              ethers.ZeroAddress,
            );
          });

          it('emits only a transfer event', async function () {
            await expect(receipt)
              .to.emit(this.token, 'Transfer')
              .withArgs(owner.address, owner.address, tokenId);
          });

          it('keeps the owner balance', async function () {
            expect(await this.token.balanceOf(owner.address)).to.eql(bn(2));
          });
        });

        context('when the address of the previous owner is incorrect', () => {
          it('reverts', async function () {
            await expect(
              transferFunction(
                this.token,
                others[0].address,
                others[0].address,
                tokenId,
                owner,
              ),
            ).to.be.revertedWithCustomError(
              this.token,
              'ERC721TransferFromIncorrectOwner',
            );
          });
        });

        context('when the sender is not authorized for the token id', () => {
          it('reverts', async function () {
            // Standard ERC721 will use the latter. Every Nestable would have it defined and use it instead
            const error = this.token.interface.getError(
              'RMRKNotApprovedOrDirectOwner()',
            )
              ? 'RMRKNotApprovedOrDirectOwner'
              : 'ERC721NotApprovedOrOwner';
            await expect(
              transferFunction(
                this.token,
                owner.address,
                others[0].address,
                tokenId,
                others[0],
              ),
            ).to.be.revertedWithCustomError(this.token, error);
          });
        });

        context('when the given token ID does not exist', () => {
          it('reverts', async function () {
            await expect(
              transferFunction(
                this.token,
                owner.address,
                others[0].address,
                nonExistentTokenId,
                owner,
              ),
            ).to.be.revertedWithCustomError(this.token, 'ERC721InvalidTokenId');
          });
        });

        context(
          'when the address to transfer the token to is the zero address',
          () => {
            it('reverts', async function () {
              await expect(
                transferFunction(
                  this.token,
                  owner.address,
                  ethers.ZeroAddress,
                  tokenId,
                  owner,
                ),
              ).to.be.revertedWithCustomError(
                this.token,
                'ERC721TransferToTheZeroAddress',
              );
            });
          },
        );
      };

      describe('via transferFrom', () => {
        shouldTransferTokensByUsers(
          (
            token: GenericTransferable,
            from: string,
            to: string,
            tokenId: bigint,
            user: SignerWithAddress,
          ) => token.connect(user).transferFrom(from, to, tokenId),
        );
      });

      describe('via safeTransferFrom', () => {
        const safeTransferFromWithData = (
          token: GenericTransferable,
          from: string,
          to: string,
          tokenId: bigint,
          user: SignerWithAddress,
        ) =>
          token
            .connect(user)
            ['safeTransferFrom(address,address,uint256,bytes)'](
              from,
              to,
              tokenId,
              data,
            );

        const safeTransferFromWithoutData = (
          token: GenericTransferable,
          from: string,
          to: string,
          tokenId: bigint,
          user: SignerWithAddress,
        ) =>
          token
            .connect(user)
            ['safeTransferFrom(address,address,uint256)'](from, to, tokenId);

        const shouldTransferSafely = (transferFun: any, data: any) => {
          describe('to a user account', () => {
            shouldTransferTokensByUsers(transferFun);
          });

          describe('to a valid receiver contract', () => {
            beforeEach(async function () {
              receiver = await this.receiverFactory.deploy(
                RECEIVER_MAGIC_VALUE,
                Error.None,
              );
              await receiver.waitForDeployment();
              toWhom = receiver;
            });

            shouldTransferTokensByUsers(transferFun);

            it('calls onERC721Received', async function () {
              receipt = await transferFun(
                this.token,
                owner.address,
                await receiver.getAddress(),
                tokenId,
                owner,
              );

              await expect(receipt)
                .to.emit(receiver, 'Received')
                .withArgs(owner.address, owner.address, tokenId, data);
            });

            it('calls onERC721Received from approved', async function () {
              receipt = await transferFun(
                this.token,
                owner.address,
                await receiver.getAddress(),
                tokenId,
                approved,
              );
              await expect(receipt)
                .to.emit(receiver, 'Received')
                .withArgs(approved.address, owner.address, tokenId, data);
            });

            describe('with an invalid token id', () => {
              it('reverts', async function () {
                await expect(
                  transferFun(
                    this.token,
                    owner.address,
                    await receiver.getAddress(),
                    nonExistentTokenId,
                    owner,
                  ),
                ).to.be.revertedWithCustomError(
                  this.token,
                  'ERC721InvalidTokenId',
                );
              });
            });
          });
        };

        describe('with data', () => {
          shouldTransferSafely(safeTransferFromWithData, data);
        });

        describe('without data', () => {
          shouldTransferSafely(safeTransferFromWithoutData, '0x');
        });

        describe('to a receiver contract returning unexpected value', () => {
          it('reverts', async function () {
            const receiverFactory =
              await ethers.getContractFactory('ERC721ReceiverMock');
            const invalidReceiver = await receiverFactory.deploy(
              ethers.zeroPadValue('0x42', 4),
              Error.None,
            );
            await invalidReceiver.waitForDeployment();
            await expect(
              this.token['safeTransferFrom(address,address,uint256)'](
                owner.address,
                await invalidReceiver.getAddress(),
                tokenId,
              ),
            ).to.be.revertedWithCustomError(
              this.token,
              'ERC721TransferToNonReceiverImplementer',
            );
          });
        });

        describe('to a receiver contract that reverts with message', () => {
          it('reverts', async function () {
            const receiverFactory =
              await ethers.getContractFactory('ERC721ReceiverMock');
            const revertingReceiver = await receiverFactory.deploy(
              ethers.zeroPadValue('0x42', 4),
              Error.RevertWithMessage,
            );
            await revertingReceiver.waitForDeployment();
            await expect(
              this.token
                .connect(owner)
                ['safeTransferFrom(address,address,uint256)'](
                  owner.address,
                  await revertingReceiver.getAddress(),
                  tokenId,
                ),
            ).to.be.revertedWith('ERC721ReceiverMock: reverting');
          });
        });

        describe('to a receiver contract that reverts without message', () => {
          it('reverts', async function () {
            const receiverFactory =
              await ethers.getContractFactory('ERC721ReceiverMock');
            const revertingReceiver = await receiverFactory.deploy(
              RECEIVER_MAGIC_VALUE,
              Error.RevertWithoutMessage,
            );
            await revertingReceiver.waitForDeployment();
            await expect(
              this.token
                .connect(owner)
                ['safeTransferFrom(address,address,uint256)'](
                  owner.address,
                  await revertingReceiver.getAddress(),
                  tokenId,
                ),
            ).to.be.revertedWithCustomError(
              this.token,
              'ERC721TransferToNonReceiverImplementer',
            );
          });
        });

        describe('to a receiver contract that panics', () => {
          it('reverts', async function () {
            const receiverFactory =
              await ethers.getContractFactory('ERC721ReceiverMock');
            const revertingReceiver = await receiverFactory.deploy(
              RECEIVER_MAGIC_VALUE,
              Error.Panic,
            );
            await revertingReceiver.waitForDeployment();
            await expect(
              this.token
                .connect(owner)
                ['safeTransferFrom(address,address,uint256)'](
                  owner.address,
                  await revertingReceiver.getAddress(),
                  tokenId,
                ),
            ).to.be.reverted;
          });
        });

        describe('to a contract that does not implement the required function', () => {
          it('reverts', async function () {
            const nonReceiver = this.token;
            await expect(
              this.token['safeTransferFrom(address,address,uint256)'](
                owner.address,
                await nonReceiver.getAddress(),
                tokenId,
              ),
            ).to.be.revertedWithCustomError(
              this.token,
              'ERC721TransferToNonReceiverImplementer',
            );
          });
        });
      });
    });

    describe('safe mint', () => {
      const tokenId = fourthTokenId;
      const data = '0x42';

      describe('via safeMint', () => {
        // regular minting is tested in ERC721Mintable.test.js and others
        it('calls onERC721Received — with data', async function () {
          const receiverFactory =
            await ethers.getContractFactory('ERC721ReceiverMock');
          receiver = await receiverFactory.deploy(
            RECEIVER_MAGIC_VALUE,
            Error.None,
          );
          await receiver.waitForDeployment();
          const receipt = await this.token['safeMint(address,uint256,bytes)'](
            await receiver.getAddress(),
            tokenId,
            data,
          );

          await expect(receipt)
            .to.emit(receiver, 'Received')
            .withArgs(owner.address, ethers.ZeroAddress, tokenId, data);
        });

        it('calls onERC721Received — without data', async function () {
          const receiverFactory =
            await ethers.getContractFactory('ERC721ReceiverMock');
          receiver = await receiverFactory.deploy(
            RECEIVER_MAGIC_VALUE,
            Error.None,
          );
          await receiver.waitForDeployment();
          const receipt = await this.token['safeMint(address,uint256)'](
            await receiver.getAddress(),
            tokenId,
          );

          await expect(receipt)
            .to.emit(receiver, 'Received')
            .withArgs(owner.address, ethers.ZeroAddress, tokenId, '0x');
        });
      });

      context('to a receiver contract returning unexpected value', () => {
        it('reverts', async function () {
          const receiverFactory =
            await ethers.getContractFactory('ERC721ReceiverMock');
          const invalidReceiver = await receiverFactory.deploy(
            ethers.zeroPadValue('0x42', 4),
            Error.None,
          );
          await invalidReceiver.waitForDeployment();

          await expect(
            this.token['safeMint(address,uint256)'](
              await invalidReceiver.getAddress(),
              tokenId,
            ),
          ).to.be.revertedWithCustomError(
            this.token,
            'ERC721TransferToNonReceiverImplementer',
          );
        });
      });

      context('to a receiver contract that reverts with message', () => {
        it('reverts', async function () {
          const receiverFactory =
            await ethers.getContractFactory('ERC721ReceiverMock');
          const revertingReceiver = await receiverFactory.deploy(
            ethers.zeroPadValue('0x42', 4),
            Error.RevertWithMessage,
          );
          await revertingReceiver.waitForDeployment();
          await expect(
            this.token
              .connect(owner)
              ['safeMint(address,uint256)'](
                await revertingReceiver.getAddress(),
                tokenId,
              ),
          ).to.be.revertedWith('ERC721ReceiverMock: reverting');
        });
      });

      context('to a receiver contract that reverts without message', () => {
        it('reverts', async function () {
          const receiverFactory =
            await ethers.getContractFactory('ERC721ReceiverMock');
          const revertingReceiver = await receiverFactory.deploy(
            RECEIVER_MAGIC_VALUE,
            Error.RevertWithoutMessage,
          );
          await revertingReceiver.waitForDeployment();
          await expect(
            this.token
              .connect(owner)
              ['safeMint(address,uint256)'](
                await revertingReceiver.getAddress(),
                tokenId,
              ),
          ).to.be.revertedWithCustomError(
            this.token,
            'ERC721TransferToNonReceiverImplementer',
          );
        });
      });

      context('to a receiver contract that panics', () => {
        it('reverts', async function () {
          const receiverFactory =
            await ethers.getContractFactory('ERC721ReceiverMock');
          const revertingReceiver = await receiverFactory.deploy(
            RECEIVER_MAGIC_VALUE,
            Error.Panic,
          );
          await revertingReceiver.waitForDeployment();
          await expect(
            this.token
              .connect(owner)
              ['safeMint(address,uint256)'](
                await revertingReceiver.getAddress(),
                tokenId,
              ),
          ).to.be.reverted;
        });
      });

      context(
        'to a contract that does not implement the required function',
        () => {
          it('reverts', async function () {
            const nonReceiver = this.token;
            await expect(
              this.token['safeMint(address,uint256)'](
                await nonReceiver.getAddress(),
                tokenId,
              ),
            ).to.be.revertedWithCustomError(
              this.token,
              'ERC721TransferToNonReceiverImplementer',
            );
          });
        },
      );

      describe('approve', () => {
        const tokenId = firstTokenId;

        let receipt: any = null;

        const itClearsApproval = () => {
          it('clears approval for the token', async function () {
            expect(await this.token.getApproved(tokenId)).to.be.equal(
              ethers.ZeroAddress,
            );
          });
        };

        const itApproves = (address: string) => {
          it('sets the approval for the target address', async function () {
            expect(await this.token.getApproved(tokenId)).to.be.equal(address);
          });
        };

        const itEmitsApprovalEvent = (address: string) => {
          it('emits an approval event', async function () {
            await expect(receipt)
              .to.emit(this.token, 'Approval')
              .withArgs(owner.address, address, tokenId);
          });
        };

        context('when clearing approval', () => {
          context('when there was no prior approval', () => {
            beforeEach(async function () {
              receipt = await this.token.approve(ethers.ZeroAddress, tokenId);
            });

            itClearsApproval();
            itEmitsApprovalEvent(ethers.ZeroAddress);
          });

          context('when there was a prior approval', () => {
            beforeEach(async function () {
              await this.token.approve(approved.address, tokenId);
              receipt = await this.token.approve(ethers.ZeroAddress, tokenId);
            });

            itClearsApproval();
            itEmitsApprovalEvent(ethers.ZeroAddress);
          });
        });

        context('when approving a non-zero address', () => {
          context('when there was no prior approval', () => {
            beforeEach(async function () {
              receipt = await this.token.approve(approved.address, tokenId);
            });

            afterEach(async () => {
              itApproves(approved.address);
              itEmitsApprovalEvent(approved.address);
            });
          });

          context('when there was a prior approval to the same address', () => {
            beforeEach(async function () {
              await this.token.approve(approved.address, tokenId);
              receipt = await this.token.approve(approved.address, tokenId);
            });

            afterEach(async () => {
              itApproves(approved.address);
              itEmitsApprovalEvent(approved.address);
            });
          });

          context(
            'when there was a prior approval to a different address',
            () => {
              beforeEach(async function () {
                await this.token.approve(anotherApproved.address, tokenId);
                receipt = await this.token.approve(
                  anotherApproved.address,
                  tokenId,
                );
              });

              afterEach(async () => {
                itApproves(anotherApproved.address);
                itEmitsApprovalEvent(anotherApproved.address);
              });
            },
          );
        });

        context(
          'when the address that receives the approval is the owner',
          () => {
            it('reverts', async function () {
              await expect(
                this.token.approve(owner.address, tokenId),
              ).to.be.revertedWithCustomError(
                this.token,
                'ERC721ApprovalToCurrentOwner',
              );
            });
          },
        );

        context('when the sender does not own the given token ID', () => {
          it('reverts', async function () {
            await expect(
              this.token.connect(others[0]).approve(approved.address, tokenId),
            ).to.be.revertedWithCustomError(
              this.token,
              'ERC721ApproveCallerIsNotOwnerNorApprovedForAll',
            );
          });
        });

        context('when the sender is approved for the given token ID', () => {
          it('reverts', async function () {
            await this.token.approve(approved.address, tokenId);
            await expect(
              this.token
                .connect(approved)
                .approve(anotherApproved.address, tokenId),
            ).to.be.revertedWithCustomError(
              this.token,
              'ERC721ApproveCallerIsNotOwnerNorApprovedForAll',
            );
          });
        });

        context('when the sender is an operator', () => {
          beforeEach(async function () {
            await this.token.setApprovalForAll(
              await operator.getAddress(),
              true,
            );
            receipt = await this.token
              .connect(operator)
              .approve(approved.address, tokenId);
          });

          afterEach(async () => {
            itApproves(approved.address);
            itEmitsApprovalEvent(approved.address);
          });
        });

        context('when the given token ID does not exist', () => {
          it('reverts', async function () {
            await expect(
              this.token
                .connect(operator)
                .approve(approved.address, nonExistentTokenId),
            ).to.be.revertedWithCustomError(this.token, 'ERC721InvalidTokenId');
          });
        });
      });

      describe('setApprovalForAll', () => {
        context('when the operator willing to approve is not the owner', () => {
          context(
            'when there is no operator approval set by the sender',
            () => {
              it('approves the operator', async function () {
                await this.token.setApprovalForAll(
                  await operator.getAddress(),
                  true,
                );

                expect(
                  await this.token.isApprovedForAll(
                    owner.address,
                    await operator.getAddress(),
                  ),
                ).to.equal(true);
              });

              it('emits an approval event', async function () {
                const receipt = await this.token.setApprovalForAll(
                  await operator.getAddress(),
                  true,
                );

                await expect(receipt)
                  .to.emit(this.token, 'ApprovalForAll')
                  .withArgs(owner.address, await operator.getAddress(), true);
              });
            },
          );

          context('when the operator was set as not approved', () => {
            beforeEach(async function () {
              await this.token.setApprovalForAll(
                await operator.getAddress(),
                false,
              );
            });

            it('approves the operator', async function () {
              await this.token.setApprovalForAll(
                await operator.getAddress(),
                true,
              );

              expect(
                await this.token.isApprovedForAll(
                  owner.address,
                  await operator.getAddress(),
                ),
              ).to.equal(true);
            });

            it('emits an approval event', async function () {
              const receipt = await this.token.setApprovalForAll(
                await operator.getAddress(),
                true,
              );

              await expect(receipt)
                .to.emit(this.token, 'ApprovalForAll')
                .withArgs(owner.address, await operator.getAddress(), true);
            });

            it('can unset the operator approval', async function () {
              await this.token.setApprovalForAll(
                await operator.getAddress(),
                false,
              );

              expect(
                await this.token.isApprovedForAll(
                  owner.address,
                  await operator.getAddress(),
                ),
              ).to.equal(false);
            });
          });

          context('when the operator was already approved', () => {
            beforeEach(async function () {
              await this.token.setApprovalForAll(
                await operator.getAddress(),
                true,
              );
            });

            it('keeps the approval to the given address', async function () {
              await this.token.setApprovalForAll(
                await operator.getAddress(),
                true,
              );

              expect(
                await this.token.isApprovedForAll(
                  owner.address,
                  await operator.getAddress(),
                ),
              ).to.equal(true);
            });

            it('emits an approval event', async function () {
              const receipt = await this.token.setApprovalForAll(
                await operator.getAddress(),
                true,
              );

              await expect(receipt)
                .to.emit(this.token, 'ApprovalForAll')
                .withArgs(owner.address, await operator.getAddress(), true);
            });
          });
        });

        context('when the operator is the owner', () => {
          it('reverts', async function () {
            await expect(
              this.token.setApprovalForAll(owner.address, true),
            ).to.be.revertedWithCustomError(
              this.token,
              'ERC721ApproveToCaller',
            );
          });
        });
      });

      describe('getApproved', async () => {
        context('when token is not minted', async () => {
          it('reverts', async function () {
            await expect(
              this.token.getApproved(nonExistentTokenId),
            ).to.be.revertedWithCustomError(this.token, 'ERC721InvalidTokenId');
          });
        });

        context('when token has been minted ', async () => {
          it('should return the zero address', async function () {
            expect(await this.token.getApproved(firstTokenId)).to.be.equal(
              ethers.ZeroAddress,
            );
          });

          context('when account has been approved', async () => {
            beforeEach(async function () {
              await this.token.approve(approved.address, firstTokenId);
            });

            it('returns approved account', async function () {
              expect(await this.token.getApproved(firstTokenId)).to.be.equal(
                approved.address,
              );
            });
          });
        });
      });
    });
  });

  context('_mint(address, uint256)', () => {
    beforeEach(async () => {
      [owner, ...others] = await ethers.getSigners();
    });

    it('reverts with a null destination address', async function () {
      await expect(
        this.token['mint(address,uint256)'](ethers.ZeroAddress, firstTokenId),
      ).to.be.revertedWithCustomError(this.token, 'ERC721MintToTheZeroAddress');
    });

    context('with minted token', async () => {
      beforeEach(async function () {
        receipt = await this.token['mint(address,uint256)'](
          owner.address,
          firstTokenId,
        );
      });

      it('emits a Transfer event', async function () {
        await expect(receipt)
          .to.emit(this.token, 'Transfer')
          .withArgs(ethers.ZeroAddress, owner.address, firstTokenId);
      });

      it('creates the token', async function () {
        expect(await this.token.balanceOf(owner.address)).to.eql(bn(1));
        expect(await this.token.ownerOf(firstTokenId)).to.equal(owner.address);
      });

      it('reverts when adding a token id that already exists', async function () {
        await expect(
          this.token['mint(address,uint256)'](owner.address, firstTokenId),
        ).to.be.revertedWithCustomError(this.token, 'ERC721TokenAlreadyMinted');
      });
    });
  });

  context('_burn', () => {
    beforeEach(async () => {
      [owner, ...others] = await ethers.getSigners();
    });

    it('reverts when burning a non-existent token id', async function () {
      await expect(
        this.token['burn(uint256)'](nonExistentTokenId),
      ).to.be.revertedWithCustomError(this.token, 'ERC721InvalidTokenId');
    });

    context('with minted tokens', () => {
      beforeEach(async function () {
        await this.token['mint(address,uint256)'](owner.address, firstTokenId);
        await this.token['mint(address,uint256)'](owner.address, secondTokenId);
      });

      context('with burnt token', () => {
        beforeEach(async function () {
          receipt = await this.token['burn(uint256)'](firstTokenId);
        });

        it('emits a Transfer event', async function () {
          await expect(receipt)
            .to.emit(this.token, 'Transfer')
            .withArgs(owner.address, ethers.ZeroAddress, firstTokenId);
        });

        it('emits an Approval event', async function () {
          await expect(receipt)
            .to.emit(this.token, 'Approval')
            .withArgs(owner.address, ethers.ZeroAddress, firstTokenId);
        });

        it('deletes the token', async function () {
          expect(await this.token.balanceOf(owner.address)).to.eql(bn(1));
          await expect(
            this.token.ownerOf(firstTokenId),
          ).to.be.revertedWithCustomError(this.token, 'ERC721InvalidTokenId');
        });

        it('reverts when burning a token id that has been deleted', async function () {
          await expect(
            this.token['burn(uint256)'](firstTokenId),
          ).to.be.revertedWithCustomError(this.token, 'ERC721InvalidTokenId');
        });
      });
    });
  });
}

export default shouldBehaveLikeERC721;
