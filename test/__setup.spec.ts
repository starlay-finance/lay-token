import { MockToken } from './../types/MockToken.d';
import rawBRE from 'hardhat';

import {
  getEthersSigners,
  deployLayToken,
  deployInitializableAdminUpgradeabilityProxy,
  deployMintableErc20,
  insertContractAddressInDb,
  registerContractInJsonDb,
  deployMockTransferHook,
  deployMockVesting,
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
  const mockLendToken = await deployMintableErc20(['LEND token', 'LEND', 18]);
  const mockTokenVesting = await deployMockVesting(layTokenProxy.address);

  await insertContractAddressInDb(eContractid.MockTokenVesting, mockTokenVesting.address);
  await registerContractInJsonDb('LEND', mockLendToken);

  const lendTolayMigratorProxy = await deployInitializableAdminUpgradeabilityProxy();

  const mockTransferHook = await deployMockTransferHook();

  const layTokenEncodedInitialize = layTokenImpl.interface.encodeFunctionData('initialize', [
    mockTokenVesting.address,
    mockTransferHook.address,
  ]);

  await waitForTx(
    await layTokenProxy['initialize(address,address,bytes)'](
      layTokenImpl.address,
      layAdmin,
      layTokenEncodedInitialize
    )
  );

  //we will not run the initialize on the migrator - will be executed by the governance to bootstrap the migration
  await waitForTx(
    await lendTolayMigratorProxy['initialize(address,address,bytes)'](
      mockTokenVesting.address,
      layAdmin,
      '0x'
    )
  );

  await insertContractAddressInDb(eContractid.LayToken, layTokenProxy.address);

  await insertContractAddressInDb(eContractid.MintableErc20, mockLendToken.address);

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
