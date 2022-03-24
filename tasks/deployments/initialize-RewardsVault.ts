import { InitializableAdminUpgradeabilityProxy } from '../../types/InitializableAdminUpgradeabilityProxy';
import { task } from 'hardhat/config';
import { eContractid } from '../../helpers/types';
import {
  getLayToken,
  getLayTokenImpl,
  getContract,
  getTokenVesting,
  getStarlayRewardsVaultImpl,
  getStarlayRewardsVaultProxy,
} from '../../helpers/contracts-helpers';
import { waitForTx } from '../../helpers/misc-utils';
import { ZERO_ADDRESS } from '../../helpers/constants';

const { StarlayRewardsVault } = eContractid;

task(`initialize-${StarlayRewardsVault}`, `Initialize the ${StarlayRewardsVault} proxy contract`)
  .addParam(
    'admin',
    `The address to be added as an Admin role in ${StarlayRewardsVault} Transparent Proxy.`
  )
  .addParam('incentivesController', `The address of IncentivesController.`)
  .addFlag('onlyProxy', 'Initialize only the proxy contract, not the implementation contract')
  .setAction(async ({ admin: layAdmin, incentivesController }, localBRE) => {
    await localBRE.run('set-dre');

    if (!layAdmin) {
      throw new Error(
        `Missing --admin parameter to add the Admin Role to ${StarlayRewardsVault} Transparent Proxy`
      );
    }

    if (!localBRE.network.config.chainId) {
      throw new Error('INVALID_CHAIN_ID');
    }

    console.log(`\n- ${StarlayRewardsVault} initialization`);

    const rewardsVaultImpl = await getStarlayRewardsVaultImpl();
    const rewardsVaultProxy = await getStarlayRewardsVaultProxy();
    const layToken = await getLayToken();

    console.log('\tInitializing Vault and Transparent Proxy');
    // If any other testnet, initialize for development purposes
    const rewardsVaultEncodedInitialize = rewardsVaultImpl.interface.encodeFunctionData(
      'initialize',
      [layToken.address, incentivesController]
    );

    await waitForTx(
      await rewardsVaultProxy['initialize(address,address,bytes)'](
        layToken.address,
        incentivesController,
        rewardsVaultEncodedInitialize
      )
    );

    console.log('\tFinished Lay Token and Transparent Proxy initialization');
  });
