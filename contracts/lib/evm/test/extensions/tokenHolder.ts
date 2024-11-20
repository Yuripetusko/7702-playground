import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { ERC20Mock, RMRKTokenHolderMock } from '../../typechain-types';
import { IERC165, IERC7590, IOtherInterface } from '../interfaces';
import { bn } from '../utils';

// --------------- FIXTURES -----------------------

async function tokenHolderFixture() {
  const tokenHolderFactory = await ethers.getContractFactory(
    'RMRKTokenHolderMock',
  );
  const tokenHolder = await tokenHolderFactory.deploy(
    'Secure Token Transfer Protocol',
    'STTP',
  );
  await tokenHolder.waitForDeployment();

  const erc20Factory = await ethers.getContractFactory('ERC20Mock');
  const erc20A = await erc20Factory.deploy();
  await erc20A.waitForDeployment();

  const erc20B = await erc20Factory.deploy();
  await erc20B.waitForDeployment();

  return {
    tokenHolder,
    erc20A,
    erc20B,
  };
}

describe('RMRKTokenHolder', async () => {
  let tokenHolder: RMRKTokenHolderMock;
  let erc20A: ERC20Mock;
  let erc20B: ERC20Mock;
  let holder: SignerWithAddress;
  let otherHolder: SignerWithAddress;
  let addrs: SignerWithAddress[];
  const tokenHolderId = bn(1);
  const otherTokenHolderId = bn(2);
  const tokenId = bn(1);
  const mockValue = ethers.parseEther('10');

  beforeEach(async () => {
    [holder, otherHolder, ...addrs] = await ethers.getSigners();
    ({ tokenHolder, erc20A, erc20B } = await loadFixture(tokenHolderFixture));
  });

  it('can support IERC165', async () => {
    expect(await tokenHolder.supportsInterface(IERC165)).to.equal(true);
  });

  it('can support TokenHolder', async () => {
    expect(await tokenHolder.supportsInterface(IERC7590)).to.equal(true);
  });

  it('does not support other interfaces', async () => {
    expect(await tokenHolder.supportsInterface(IOtherInterface)).to.equal(
      false,
    );
  });

  describe('With minted tokens', async () => {
    beforeEach(async () => {
      await tokenHolder.mint(holder.address, tokenHolderId);
      await tokenHolder.mint(otherHolder.address, otherTokenHolderId);
      await erc20A.mint(holder.address, mockValue);
      await erc20A.mint(otherHolder.address, mockValue);
    });

    it('can receive ERC-20 tokens', async () => {
      await erc20A.approve(await tokenHolder.getAddress(), mockValue);
      await expect(
        tokenHolder.transferERC20ToToken(
          await erc20A.getAddress(),
          tokenHolderId,
          mockValue,
          '0x00',
        ),
      )
        .to.emit(tokenHolder, 'ReceivedERC20')
        .withArgs(
          await erc20A.getAddress(),
          tokenHolderId,
          holder.address,
          mockValue,
        );
      expect(await erc20A.balanceOf(await tokenHolder.getAddress())).to.equal(
        mockValue,
      );
    });

    it('can transfer ERC-20 tokens', async () => {
      await erc20A.approve(await tokenHolder.getAddress(), mockValue);
      await tokenHolder.transferERC20ToToken(
        await erc20A.getAddress(),
        tokenHolderId,
        mockValue,
        '0x00',
      );
      await expect(
        tokenHolder.transferHeldERC20FromToken(
          await erc20A.getAddress(),
          tokenHolderId,
          holder.address,
          mockValue / 2n,
          '0x00',
        ),
      )
        .to.emit(tokenHolder, 'TransferredERC20')
        .withArgs(
          await erc20A.getAddress(),
          tokenHolderId,
          holder.address,
          mockValue / 2n,
        );
      expect(await erc20A.balanceOf(await tokenHolder.getAddress())).to.equal(
        mockValue / 2n,
      );
      expect(await tokenHolder.erc20TransferOutNonce(tokenHolderId)).to.equal(
        1,
      );
    });

    it('cannot transfer 0 value', async () => {
      await expect(
        tokenHolder.transferERC20ToToken(
          await erc20A.getAddress(),
          tokenId,
          0,
          '0x00',
        ),
      ).to.be.revertedWithCustomError(tokenHolder, 'InvalidValue');

      await expect(
        tokenHolder.transferHeldERC20FromToken(
          await erc20A.getAddress(),
          tokenId,
          holder.address,
          0,
          '0x00',
        ),
      ).to.be.revertedWithCustomError(tokenHolder, 'InvalidValue');
    });

    it('cannot transfer to address 0', async () => {
      await expect(
        tokenHolder.transferHeldERC20FromToken(
          await erc20A.getAddress(),
          tokenId,
          ethers.ZeroAddress,
          1,
          '0x00',
        ),
      ).to.be.revertedWithCustomError(tokenHolder, 'InvalidAddress');
    });

    it('cannot transfer a token at address 0', async () => {
      await expect(
        tokenHolder.transferHeldERC20FromToken(
          ethers.ZeroAddress,
          tokenId,
          holder.address,
          1,
          '0x00',
        ),
      ).to.be.revertedWithCustomError(tokenHolder, 'InvalidAddress');

      await expect(
        tokenHolder.transferERC20ToToken(
          ethers.ZeroAddress,
          tokenId,
          1,
          '0x00',
        ),
      ).to.be.revertedWithCustomError(tokenHolder, 'InvalidAddress');
    });

    it('cannot transfer more balance than the token has', async () => {
      await erc20A.approve(await tokenHolder.getAddress(), mockValue);

      await tokenHolder.transferERC20ToToken(
        await erc20A.getAddress(),
        tokenId,
        mockValue / 2n,
        '0x00',
      );
      await tokenHolder.transferERC20ToToken(
        await erc20A.getAddress(),
        otherTokenHolderId,
        mockValue / 2n,
        '0x00',
      );
      await expect(
        tokenHolder.transferHeldERC20FromToken(
          await erc20A.getAddress(),
          tokenId,
          holder.address,
          mockValue, // The token only owns half of this value
          '0x00',
        ),
      ).to.be.revertedWithCustomError(tokenHolder, 'InsufficientBalance');
    });

    it('cannot transfer balance from not owned token', async () => {
      await erc20A.approve(await tokenHolder.getAddress(), mockValue);
      await tokenHolder.transferERC20ToToken(
        await erc20A.getAddress(),
        tokenHolderId,
        mockValue,
        '0x00',
      );
      // Other holder is not the owner of tokenId
      await expect(
        tokenHolder
          .connect(otherHolder)
          .transferHeldERC20FromToken(
            await erc20A.getAddress(),
            tokenHolderId,
            otherHolder.address,
            mockValue,
            '0x00',
          ),
      ).to.be.revertedWithCustomError(
        tokenHolder,
        'OnlyNFTOwnerCanTransferTokensFromIt',
      );
    });

    it('can manage multiple ERC20s', async () => {
      await erc20B.mint(holder.address, mockValue);
      await erc20A.approve(await tokenHolder.getAddress(), mockValue);
      await erc20B.approve(await tokenHolder.getAddress(), mockValue);

      await tokenHolder.transferERC20ToToken(
        await erc20A.getAddress(),
        tokenHolderId,
        ethers.parseEther('3'),
        '0x00',
      );
      await tokenHolder.transferERC20ToToken(
        await erc20B.getAddress(),
        tokenHolderId,
        ethers.parseEther('5'),
        '0x00',
      );

      expect(
        await tokenHolder.balanceOfERC20(
          await erc20A.getAddress(),
          tokenHolderId,
        ),
      ).to.equal(ethers.parseEther('3'));
      expect(
        await tokenHolder.balanceOfERC20(
          await erc20B.getAddress(),
          tokenHolderId,
        ),
      ).to.equal(ethers.parseEther('5'));
    });
  });
});
