import { TokenVesting__factory } from '../../types/factories/TokenVesting__factory';
import { task } from 'hardhat/config';
import { registerContractInJsonDb, deployRewardsVault } from '../../helpers/contracts-helpers';
import { eContractid } from '../../helpers/types';

const { StarlayRewardsVault } = eContractid;

task(`deploy-${StarlayRewardsVault}`, `Deploys the ${StarlayRewardsVault} contract`)
  .addFlag('verify', 'Proceed with the Etherscan verification')
  .setAction(async ({ verify }, localBRE) => {
    await localBRE.run('set-dre');

    if (!localBRE.network.config.chainId) {
      throw new Error('INVALID_CHAIN_ID');
    }

    console.log(`\n- ${StarlayRewardsVault} deployment`);

    console.log(`\tDeploying ${StarlayRewardsVault} implementation ...`);
    const rewardsVault = await deployRewardsVault(verify);
    await registerContractInJsonDb(StarlayRewardsVault, rewardsVault);

    console.log(`\tFinished ${StarlayRewardsVault} deployment`);
  });
