import { InitializableAdminUpgradeabilityProxy } from './../../types/InitializableAdminUpgradeabilityProxy.d';
import { task } from 'hardhat/config';
import { eContractid } from '../../helpers/types';
import {
  getLayToken,
  getLayTokenImpl,
  getContract,
  getTokenVesting,
  getStarlayRewardsVault,
  getStarlayRewardsVaultProxy,
} from '../../helpers/contracts-helpers';
import { waitForTx } from '../../helpers/misc-utils';
import { ZERO_ADDRESS } from '../../helpers/constants';

const { LayToken } = eContractid;

task(`initialize-${LayToken}`, `Initialize the ${LayToken} proxy contract`)
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

    const layTokenImpl = await getLayTokenImpl();
    const layToken = await getLayToken();
    const tokenVesting = await getTokenVesting();
    const rewardsVault = await getStarlayRewardsVaultProxy();
    const layTokenProxy = await getContract<InitializableAdminUpgradeabilityProxy>(
      eContractid.InitializableAdminUpgradeabilityProxy,
      layToken.address
    );

    if (onlyProxy) {
      console.log(
        `\tWARNING: Not initializing the ${LayToken} implementation, only set LAY_ADMIN to Transparent Proxy contract.`
      );
      await waitForTx(
        await layTokenProxy.functions['initialize(address,address,bytes)'](
          layTokenImpl.address,
          tokenVesting.address,
          '0x'
        )
      );
      console.log(
        `\tFinished ${LayToken} Proxy initialization, but not ${LayToken} implementation.`
      );
      return;
    }

    console.log('\tInitializing Lay Token and Transparent Proxy');
    // If any other testnet, initialize for development purposes
    const layTokenEncodedInitialize = layTokenImpl.interface.encodeFunctionData('initialize', [
      tokenVesting.address,
      rewardsVault.address,
      ZERO_ADDRESS,
    ]);

    await waitForTx(
      await layTokenProxy['initialize(address,address,bytes)'](
        layTokenImpl.address,
        layAdmin,
        layTokenEncodedInitialize
      )
    );

    console.log('\tFinished Lay Token and Transparent Proxy initialization');
  });
