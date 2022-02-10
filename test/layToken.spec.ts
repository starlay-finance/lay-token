import { parseEther } from 'ethers/lib/utils';
import { fail } from 'assert';
import { ethers } from 'ethers';
import BigNumber from 'bignumber.js';
import { TestEnv, makeSuite } from './helpers/make-suite';
import { ProtocolErrors } from '../helpers/types';
import { eEthereumNetwork } from '../helpers/types-common';
import { waitForTx, DRE } from '../helpers/misc-utils';
import {
  getInitializableAdminUpgradeabilityProxy,
  buildPermitParams,
  getSignatureFromTypedData,
  deployDoubleTransferHelper,
} from '../helpers/contracts-helpers';
import {
  getLayTokenDomainSeparatorPerNetwork,
  ZERO_ADDRESS,
  MAX_UINT_AMOUNT,
} from '../helpers/constants';

const { expect } = require('chai');

makeSuite('LAY token', (testEnv: TestEnv) => {
  const {} = ProtocolErrors;

  it('Checks initial configuration', async () => {
    const { layToken } = testEnv;

    expect(await layToken.name()).to.be.equal('Lay Token', 'Invalid token name');

    expect(await layToken.symbol()).to.be.equal('LAY', 'Invalid token symbol');

    expect((await layToken.decimals()).toString()).to.be.equal('18', 'Invalid token decimals');
  });

  it('Checks the domain separator', async () => {
    const network = DRE.network.name;
    const DOMAIN_SEPARATOR_ENCODED = getLayTokenDomainSeparatorPerNetwork(
      network as eEthereumNetwork
    );
    const { layToken } = testEnv;

    const separator = await layToken.DOMAIN_SEPARATOR();
    expect(separator).to.be.equal(DOMAIN_SEPARATOR_ENCODED, 'Invalid domain separator');
  });

  it('Checks the revision', async () => {
    const { layToken: layToken } = testEnv;

    const revision = await layToken.REVISION();

    expect(revision.toString()).to.be.equal('1', 'Invalid revision');
  });

  it('Checks the allocation of the initial LAY supply', async () => {
    const expectedMigratorBalance = new BigNumber(13000000).times(new BigNumber(10).pow(18));
    const expectedlDistributorBalance = new BigNumber(0).times(new BigNumber(10).pow(18));
    const { layToken, mockVesting } = testEnv;
    const migratorBalance = await layToken.balanceOf(mockVesting.address);
    const distributorBalance = await layToken.balanceOf(testEnv.users[0].address);

    expect(migratorBalance.toString()).to.be.equal(
      expectedMigratorBalance.toFixed(0),
      'Invalid migrator balance'
    );
    expect(distributorBalance.toString()).to.be.equal(
      expectedlDistributorBalance.toFixed(0),
      'Invalid migrator balance'
    );
  });

  it('Record correctly snapshot on release', async () => {
    const { layToken, deployer, mockVesting } = testEnv;

    await mockVesting.releaseMock(deployer.address, parseEther('2'));
    expect((await layToken.balanceOf(deployer.address)).toString()).to.be.equal(
      ethers.utils.parseEther('2'),
      'INVALID_BALANCE_AFTER_MIGRATION'
    );

    const userCountOfSnapshots = await layToken._countsSnapshots(deployer.address);
    const snapshot = await layToken._snapshots(deployer.address, userCountOfSnapshots.sub(1));
    expect(userCountOfSnapshots.toString()).to.be.equal('1', 'INVALID_SNAPSHOT_COUNT');
    expect(snapshot.value.toString()).to.be.equal(
      ethers.utils.parseEther('2'),
      'INVALID_SNAPSHOT_VALUE'
    );
  });

  it('Record correctly snapshot on transfer', async () => {
    const { layToken, deployer, users } = testEnv;
    const from = deployer.address;
    const to = users[1].address;
    await waitForTx(await layToken.transfer(to, ethers.utils.parseEther('1')));
    const fromCountOfSnapshots = await layToken._countsSnapshots(from);
    const fromLastSnapshot = await layToken._snapshots(from, fromCountOfSnapshots.sub(1));
    const fromPreviousSnapshot = await layToken._snapshots(from, fromCountOfSnapshots.sub(2));

    const toCountOfSnapshots = await layToken._countsSnapshots(to);
    const toSnapshot = await layToken._snapshots(to, toCountOfSnapshots.sub(1));

    expect(fromCountOfSnapshots.toString()).to.be.equal('2', 'INVALID_SNAPSHOT_COUNT');
    expect(fromLastSnapshot.value.toString()).to.be.equal(
      ethers.utils.parseEther('1'),
      'INVALID_SNAPSHOT_VALUE'
    );
    expect(fromPreviousSnapshot.value.toString()).to.be.equal(
      ethers.utils.parseEther('2'),
      'INVALID_SNAPSHOT_VALUE'
    );

    expect(toCountOfSnapshots.toString()).to.be.equal('1', 'INVALID_SNAPSHOT_COUNT');
    expect(toSnapshot.value.toString()).to.be.equal(
      ethers.utils.parseEther('1'),
      'INVALID_SNAPSHOT_VALUE'
    );
  });

  it('Reverts submitting a permit with 0 expiration', async () => {
    const { layToken: layToken, deployer, users } = testEnv;
    const owner = deployer.address;
    const spender = users[1].address;

    const { chainId } = await DRE.ethers.provider.getNetwork();
    if (!chainId) {
      fail("Current network doesn't have CHAIN ID");
    }
    const expiration = 0;
    const nonce = (await layToken._nonces(owner)).toNumber();
    const permitAmount = ethers.utils.parseEther('2').toString();
    const msgParams = buildPermitParams(
      chainId,
      layToken.address,
      owner,
      spender,
      nonce,
      permitAmount,
      expiration.toFixed()
    );

    const ownerPrivateKey = require('../test-wallets.js').accounts[0].secretKey;
    if (!ownerPrivateKey) {
      throw new Error('INVALID_OWNER_PK');
    }

    expect((await layToken.allowance(owner, spender)).toString()).to.be.equal(
      '0',
      'INVALID_ALLOWANCE_BEFORE_PERMIT'
    );

    const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

    await expect(
      layToken.connect(users[1].signer).permit(owner, spender, permitAmount, expiration, v, r, s)
    ).to.be.revertedWith('INVALID_EXPIRATION');

    expect((await layToken.allowance(owner, spender)).toString()).to.be.equal(
      '0',
      'INVALID_ALLOWANCE_AFTER_PERMIT'
    );
  });

  it('Submits a permit with maximum expiration length', async () => {
    const { layToken: layToken, deployer, users } = testEnv;
    const owner = deployer.address;
    const spender = users[1].address;

    const { chainId } = await DRE.ethers.provider.getNetwork();
    const configChainId = DRE.network.config.chainId;
    expect(configChainId).to.be.equal(chainId);
    if (!chainId) {
      fail("Current network doesn't have CHAIN ID");
    }
    const deadline = MAX_UINT_AMOUNT;
    const nonce = (await layToken._nonces(owner)).toNumber();
    const permitAmount = ethers.utils.parseEther('2').toString();
    const msgParams = buildPermitParams(
      chainId,
      layToken.address,
      owner,
      spender,
      nonce,
      deadline,
      permitAmount
    );

    const ownerPrivateKey = require('../test-wallets.js').accounts[0].secretKey;
    if (!ownerPrivateKey) {
      throw new Error('INVALID_OWNER_PK');
    }

    expect((await layToken.allowance(owner, spender)).toString()).to.be.equal(
      '0',
      'INVALID_ALLOWANCE_BEFORE_PERMIT'
    );

    const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

    await waitForTx(
      await layToken
        .connect(users[1].signer)
        .permit(owner, spender, permitAmount, deadline, v, r, s)
    );

    expect((await layToken._nonces(owner)).toNumber()).to.be.equal(1);
  });

  it('Cancels the previous permit', async () => {
    const { layToken: layToken, deployer, users } = testEnv;
    const owner = deployer.address;
    const spender = users[1].address;

    const { chainId } = await DRE.ethers.provider.getNetwork();
    if (!chainId) {
      fail("Current network doesn't have CHAIN ID");
    }
    const deadline = MAX_UINT_AMOUNT;
    const nonce = (await layToken._nonces(owner)).toNumber();
    const permitAmount = '0';
    const msgParams = buildPermitParams(
      chainId,
      layToken.address,
      owner,
      spender,
      nonce,
      deadline,
      permitAmount
    );

    const ownerPrivateKey = require('../test-wallets.js').accounts[0].secretKey;
    if (!ownerPrivateKey) {
      throw new Error('INVALID_OWNER_PK');
    }

    const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

    expect((await layToken.allowance(owner, spender)).toString()).to.be.equal(
      ethers.utils.parseEther('2'),
      'INVALID_ALLOWANCE_BEFORE_PERMIT'
    );

    await waitForTx(
      await layToken
        .connect(users[1].signer)
        .permit(owner, spender, permitAmount, deadline, v, r, s)
    );
    expect((await layToken.allowance(owner, spender)).toString()).to.be.equal(
      permitAmount,
      'INVALID_ALLOWANCE_AFTER_PERMIT'
    );

    expect((await layToken._nonces(owner)).toNumber()).to.be.equal(2);
  });

  it('Tries to submit a permit with invalid nonce', async () => {
    const { layToken: layToken, deployer, users } = testEnv;
    const owner = deployer.address;
    const spender = users[1].address;

    const { chainId } = await DRE.ethers.provider.getNetwork();
    if (!chainId) {
      fail("Current network doesn't have CHAIN ID");
    }
    const deadline = MAX_UINT_AMOUNT;
    const nonce = 1000;
    const permitAmount = '0';
    const msgParams = buildPermitParams(
      chainId,
      layToken.address,
      owner,
      spender,
      nonce,
      deadline,
      permitAmount
    );

    const ownerPrivateKey = require('../test-wallets.js').accounts[0].secretKey;
    if (!ownerPrivateKey) {
      throw new Error('INVALID_OWNER_PK');
    }

    const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

    await expect(
      layToken.connect(users[1].signer).permit(owner, spender, permitAmount, deadline, v, r, s)
    ).to.be.revertedWith('INVALID_SIGNATURE');
  });

  it('Tries to submit a permit with invalid expiration (previous to the current block)', async () => {
    const { layToken: layToken, deployer, users } = testEnv;
    const owner = deployer.address;
    const spender = users[1].address;

    const { chainId } = await DRE.ethers.provider.getNetwork();
    if (!chainId) {
      fail("Current network doesn't have CHAIN ID");
    }
    const expiration = '1';
    const nonce = (await layToken._nonces(owner)).toNumber();
    const permitAmount = '0';
    const msgParams = buildPermitParams(
      chainId,
      layToken.address,
      owner,
      spender,
      nonce,
      expiration,
      permitAmount
    );

    const ownerPrivateKey = require('../test-wallets.js').accounts[0].secretKey;
    if (!ownerPrivateKey) {
      throw new Error('INVALID_OWNER_PK');
    }

    const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

    await expect(
      layToken.connect(users[1].signer).permit(owner, spender, expiration, permitAmount, v, r, s)
    ).to.be.revertedWith('INVALID_EXPIRATION');
  });

  it('Tries to submit a permit with invalid signature', async () => {
    const { layToken: layToken, deployer, users } = testEnv;
    const owner = deployer.address;
    const spender = users[1].address;

    const { chainId } = await DRE.ethers.provider.getNetwork();
    if (!chainId) {
      fail("Current network doesn't have CHAIN ID");
    }
    const deadline = MAX_UINT_AMOUNT;
    const nonce = (await layToken._nonces(owner)).toNumber();
    const permitAmount = '0';
    const msgParams = buildPermitParams(
      chainId,
      layToken.address,
      owner,
      spender,
      nonce,
      deadline,
      permitAmount
    );

    const ownerPrivateKey = require('../test-wallets.js').accounts[0].secretKey;
    if (!ownerPrivateKey) {
      throw new Error('INVALID_OWNER_PK');
    }

    const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

    await expect(
      layToken.connect(users[1].signer).permit(owner, ZERO_ADDRESS, permitAmount, deadline, v, r, s)
    ).to.be.revertedWith('INVALID_SIGNATURE');
  });

  it('Tries to submit a permit with invalid owner', async () => {
    const { layToken: layToken, deployer, users } = testEnv;
    const owner = deployer.address;
    const spender = users[1].address;

    const { chainId } = await DRE.ethers.provider.getNetwork();
    if (!chainId) {
      fail("Current network doesn't have CHAIN ID");
    }
    const expiration = MAX_UINT_AMOUNT;
    const nonce = (await layToken._nonces(owner)).toNumber();
    const permitAmount = '0';
    const msgParams = buildPermitParams(
      chainId,
      layToken.address,
      owner,
      spender,
      nonce,
      expiration,
      permitAmount
    );

    const ownerPrivateKey = require('../test-wallets.js').accounts[0].secretKey;
    if (!ownerPrivateKey) {
      throw new Error('INVALID_OWNER_PK');
    }

    const { v, r, s } = getSignatureFromTypedData(ownerPrivateKey, msgParams);

    await expect(
      layToken
        .connect(users[1].signer)
        .permit(ZERO_ADDRESS, spender, expiration, permitAmount, v, r, s)
    ).to.be.revertedWith('INVALID_OWNER');
  });

  it('Correct snapshotting on double action in the same block', async () => {
    const { layToken: layToken, deployer, users } = testEnv;

    const doubleTransferHelper = await deployDoubleTransferHelper(layToken.address);

    const receiver = users[2].address;

    await waitForTx(
      await layToken.transfer(
        doubleTransferHelper.address,
        (await layToken.balanceOf(deployer.address)).toString()
      )
    );

    await waitForTx(
      await doubleTransferHelper.doubleSend(
        receiver,
        ethers.utils.parseEther('0.2'),
        ethers.utils.parseEther('0.8')
      )
    );

    const countSnapshotsReceiver = (await layToken._countsSnapshots(receiver)).toString();

    const snapshotReceiver = await layToken._snapshots(doubleTransferHelper.address, 0);

    const countSnapshotsSender = (
      await layToken._countsSnapshots(doubleTransferHelper.address)
    ).toString();

    expect(countSnapshotsSender).to.be.equal('2', 'INVALID_COUNT_SNAPSHOTS_SENDER');
    const snapshotsSender = [
      await layToken._snapshots(doubleTransferHelper.address, 0),
      await layToken._snapshots(doubleTransferHelper.address, 1),
    ];

    expect(snapshotsSender[0].value.toString()).to.be.equal(
      ethers.utils.parseEther('1'),
      'INVALID_SENDER_SNAPSHOT'
    );
    expect(snapshotsSender[1].value.toString()).to.be.equal(
      ethers.utils.parseEther('0'),
      'INVALID_SENDER_SNAPSHOT'
    );

    expect(countSnapshotsReceiver).to.be.equal('1', 'INVALID_COUNT_SNAPSHOTS_RECEIVER');
    expect(snapshotReceiver.value.toString()).to.be.equal(ethers.utils.parseEther('1'));
  });

  it('Emits correctly mock event of the _beforeTokenTransfer hook', async () => {
    const { layToken: layToken, mockTransferHook, users } = testEnv;

    const recipient = users[2].address;

    await expect(layToken.connect(users[1].signer).transfer(recipient, 1)).to.emit(
      mockTransferHook,
      'MockHookEvent'
    );
  });

  it("Don't record snapshot when sending funds to itself", async () => {
    const { layToken: layToken, deployer, users } = testEnv;
    const from = users[2].address;
    const to = from;
    await waitForTx(
      await layToken.connect(users[2].signer).transfer(to, ethers.utils.parseEther('1'))
    );
    const fromCountOfSnapshots = await layToken._countsSnapshots(from);
    const fromLastSnapshot = await layToken._snapshots(from, fromCountOfSnapshots.sub(1));
    const fromPreviousSnapshot = await layToken._snapshots(from, fromCountOfSnapshots.sub(2));

    const toCountOfSnapshots = await layToken._countsSnapshots(to);
    const toSnapshot = await layToken._snapshots(to, toCountOfSnapshots.sub(1));

    expect(fromCountOfSnapshots.toString()).to.be.equal('2', 'INVALID_SNAPSHOT_COUNT');
    expect(fromLastSnapshot.value.toString()).to.be.equal(
      '1000000000000000001',
      'INVALID_SNAPSHOT_VALUE'
    );
    expect(fromPreviousSnapshot.value.toString()).to.be.equal(
      ethers.utils.parseEther('1'),
      'INVALID_SNAPSHOT_VALUE'
    );

    expect(toCountOfSnapshots.toString()).to.be.equal('2', 'INVALID_SNAPSHOT_COUNT');
    expect(toSnapshot.value.toString()).to.be.equal(
      '1000000000000000001',
      'INVALID_SNAPSHOT_VALUE'
    );
  });
});
