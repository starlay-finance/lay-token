import { deployMockIncentivesController } from './../helpers/contracts-helpers';
import rawBRE from 'hardhat';

import {
  getEthersSigners,
  deployLayToken,
  deployInitializableAdminUpgradeabilityProxy,
  insertContractAddressInDb,
  deployMockTransferHook,
  deployMockVesting,
  deployRewardsVault,
} from '../helpers/contracts-helpers';

import path from 'path';
import fs from 'fs';

import { Signer } from 'ethers';

import { initializeMakeSuite } from './helpers/make-suite';
import { waitForTx, DRE } from '../helpers/misc-utils';
import { eContractid } from '../helpers/types';
import { parseEther } from 'ethers/lib/utils';

['misc', 'deployments', 'migrations'].forEach((folder) => {
  const tasksPath = path.join(__dirname, '../tasks', folder);
  fs.readdirSync(tasksPath).forEach((task) => require(`${tasksPath}/${task}`));
});

const buildTestEnv = async (deployer: Signer, secondaryWallet: Signer) => {
  console.time('setup');

  const layAdmin = await secondaryWallet.getAddress();

  const layTokenImpl = await deployLayToken();
  const layTokenProxy = await deployInitializableAdminUpgradeabilityProxy();
  const mockTokenVesting = await deployMockVesting(layTokenProxy.address);
  await insertContractAddressInDb(eContractid.MockTokenVesting, mockTokenVesting.address);

  const mockTransferHook = await deployMockTransferHook();
  const rewardsVaultImpl = await deployRewardsVault();
  await insertContractAddressInDb(eContractid.StarlayRewardsVaultImpl, rewardsVaultImpl.address);
  const rewardsVaultProxy = await deployInitializableAdminUpgradeabilityProxy();
  await insertContractAddressInDb(eContractid.StarlayRewardsVault, rewardsVaultProxy.address);

  const layTokenEncodedInitialize = layTokenImpl.interface.encodeFunctionData('initialize', [
    mockTokenVesting.address,
    rewardsVaultProxy.address,
    mockTransferHook.address,
  ]);

  await waitForTx(
    await layTokenProxy['initialize(address,address,bytes)'](
      layTokenImpl.address,
      layAdmin,
      layTokenEncodedInitialize
    )
  );
  const mockIncentivesController = await deployMockIncentivesController(
    rewardsVaultProxy.address,
    layTokenProxy.address
  );
  await insertContractAddressInDb(
    eContractid.MockIncentivesController,
    mockIncentivesController.address
  );
  const rewardsVaultEncodedInitialize = rewardsVaultImpl.interface.encodeFunctionData(
    'initialize',
    [layTokenProxy.address, mockIncentivesController.address]
  );
  await waitForTx(
    await rewardsVaultProxy['initialize(address,address,bytes)'](
      rewardsVaultImpl.address,
      layAdmin,
      rewardsVaultEncodedInitialize
    )
  );
  await insertContractAddressInDb(eContractid.StarlayRewardsVault, rewardsVaultProxy.address);

  await insertContractAddressInDb(eContractid.MockTransferHook, mockTransferHook.address);

  await insertContractAddressInDb(eContractid.MockTokenVesting, mockTokenVesting.address);

  console.timeEnd('setup');
};

before(async () => {
  await rawBRE.run('set-dre');
  const [deployer, secondaryWallet] = await getEthersSigners();
  console.log('-> Deploying test environment...');
  await buildTestEnv(deployer, secondaryWallet);
  await initializeMakeSuite();
  console.log('\n***************');
  console.log('Setup and snapshot finished');
  console.log('***************\n');
});
