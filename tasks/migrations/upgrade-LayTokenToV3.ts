import { InitializableAdminUpgradeabilityProxy } from '../../types/InitializableAdminUpgradeabilityProxy';
import { task } from 'hardhat/config';
import { eContractid } from '../../helpers/types';
import {
  getLayToken,
  getLayTokenImpl,
  getContract,
  getTokenVesting,
  getStarlayRewardsVault,
  getStarlayRewardsVaultProxy,
  getLayTokenV3,
} from '../../helpers/contracts-helpers';
import { waitForTx } from '../../helpers/misc-utils';
import { ZERO_ADDRESS } from '../../helpers/constants';

const { LayToken } = eContractid;

task(`upgrade-${LayToken}`, `Initialize the ${LayToken} proxy contract`)
  .addParam('admin', `The address to be added as an Admin role in ${LayToken} Transparent Proxy.`)
  .addFlag('onlyProxy', 'Initialize only the proxy contract, not the implementation contract')
  .setAction(async ({ admin: layAdmin, onlyProxy }, localBRE) => {
    await localBRE.run('set-dre');

    if (!layAdmin) {
      throw new Error(
        `Missing --admin parameter to add the Admin Role to ${LayToken} Transparent Proxy`
      );
    }

    if (!localBRE.network.config.chainId) {
      throw new Error('INVALID_CHAIN_ID');
    }

    console.log(`\n- ${LayToken} initialization`);

    const layTokenImpl = await getLayTokenV3();
    const layToken = await getLayToken();
    const layTokenProxy = await getContract<InitializableAdminUpgradeabilityProxy>(
      eContractid.InitializableAdminUpgradeabilityProxy,
      layToken.address
    );
    const encodedInitialize = await layTokenImpl.interface.encodeFunctionData('initialize');
    layTokenProxy.upgradeToAndCall(layTokenImpl.address, encodedInitialize);

    console.log('\tFinished Lay Token and Transparent Proxy initialization');
  });
