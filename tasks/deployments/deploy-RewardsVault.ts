import { deployInitializableAdminUpgradeabilityProxy } from './../../helpers/contracts-helpers';
import { TokenVesting__factory } from '../../types/factories/TokenVesting__factory';
import { task } from 'hardhat/config';
import { registerContractInJsonDb, deployRewardsVault } from '../../helpers/contracts-helpers';
import { eContractid } from '../../helpers/types';

const { StarlayRewardsVault, StarlayRewardsVaultImpl, StarlayRewardsVaultProxy } = eContractid;

task(`deploy-${StarlayRewardsVault}`, `Deploys the ${StarlayRewardsVault} contract`)
  .addFlag('verify', 'Proceed with the Etherscan verification')
  .setAction(async ({ verify }, localBRE) => {
    await localBRE.run('set-dre');

    if (!localBRE.network.config.chainId) {
      throw new Error('INVALID_CHAIN_ID');
    }

    console.log(`\n- ${StarlayRewardsVault} deployment`);

    console.log(`\tDeploying ${StarlayRewardsVault} implementation ...`);
    const rewardsVaultImpl = await deployRewardsVault(verify);
    await registerContractInJsonDb(StarlayRewardsVaultImpl, rewardsVaultImpl);
    console.log(`\tDeploying ${StarlayRewardsVault} proxy ...`);
    const rewardsVaultProxy = await deployInitializableAdminUpgradeabilityProxy(verify);
    await registerContractInJsonDb(StarlayRewardsVaultProxy, rewardsVaultProxy);

    console.log(`\tFinished ${StarlayRewardsVault} deployment`);
  });
