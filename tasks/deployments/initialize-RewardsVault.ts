import { task } from 'hardhat/config';
import { eContractid } from '../../helpers/types';
import {
  getEthersSigners,
  getLayToken,
  getStarlayRewardsVaultImpl,
  getStarlayRewardsVaultProxy,
} from '../../helpers/contracts-helpers';
import { waitForTx } from '../../helpers/misc-utils';
import { ZERO_ADDRESS } from '../../helpers/constants';

const { StarlayRewardsVault } = eContractid;

task(`initialize-${StarlayRewardsVault}`, `Initialize the ${StarlayRewardsVault} proxy contract`)
  .addParam('incentivesController', `The address of IncentivesController.`)
  .addFlag('onlyProxy', 'Initialize only the proxy contract, not the implementation contract')
  .setAction(async ({ incentivesController }, localBRE) => {
    await localBRE.run('set-dre');

    if (!localBRE.network.config.chainId) {
      throw new Error('INVALID_CHAIN_ID');
    }
    if (!incentivesController) {
      throw new Error(`Missing --incentives-controller parameter`);
    }

    console.log(`\n- ${StarlayRewardsVault} initialization`);

    const rewardsVaultImpl = await getStarlayRewardsVaultImpl();
    const rewardsVaultProxy = await getStarlayRewardsVaultProxy();
    const layToken = await getLayToken('0xb163716cb6c8b0a56e4f57c394A50F173E34181b');
    if (!rewardsVaultImpl.address || rewardsVaultImpl.address == ZERO_ADDRESS) {
      throw new Error('Missing rewardsVaultImpl');
    }
    if (!rewardsVaultProxy.address || rewardsVaultImpl.address == ZERO_ADDRESS) {
      throw new Error('Missing rewardsVaultProxy');
    }
    if (!layToken.address || rewardsVaultImpl.address == ZERO_ADDRESS) {
      throw new Error('Missing layToken');
    }
    console.log('\tInitializing Vault and Transparent Proxy');
    // If any other testnet, initialize for development purposes
    const rewardsVaultEncodedInitialize = rewardsVaultImpl.interface.encodeFunctionData(
      'initialize',
      [layToken.address, incentivesController]
    );
    const [admin] = await getEthersSigners();
    await waitForTx(
      await rewardsVaultProxy['initialize(address,address,bytes)'](
        rewardsVaultImpl.address,
        await admin.getAddress(),
        rewardsVaultEncodedInitialize,
        {
          gasLimit: 14000000,
        }
      )
    );

    console.log('\tFinished Lay Token and Transparent Proxy initialization');
  });
