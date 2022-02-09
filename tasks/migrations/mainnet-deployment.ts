import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { eEthereumNetwork } from '../../helpers/types-common';
import { eContractid } from '../../helpers/types';
import { checkVerification } from '../../helpers/etherscan-verification';
import { getLayAdminPerNetwork, getLendTokenPerNetwork } from '../../helpers/constants';

task('main-deployment', 'Deployment in mainnet network')
  .addFlag(
    'verify',
    'Verify LayToken, LendToLayMigrator, and InitializableAdminUpgradeabilityProxy contract.'
  )
  .setAction(async ({ verify }, localBRE) => {
    const DRE: HardhatRuntimeEnvironment = await localBRE.run('set-dre');
    const network = DRE.network.name as eEthereumNetwork;
    const LayAdmin = getLayAdminPerNetwork(network);
    const lendTokenAddress = getLendTokenPerNetwork(network);

    if (!LayAdmin) {
      throw Error(
        'The --admin parameter must be set for mainnet network. Set an Ethereum address as --admin parameter input.'
      );
    }

    // If Etherscan verification is enabled, check needed enviroments to prevent loss of gas in failed deployments.
    if (verify) {
      checkVerification();
    }

    console.log('Lay ADMIN', LayAdmin);
    await DRE.run(`deploy-${eContractid.LayToken}`, { verify });

    await DRE.run(`deploy-${eContractid.LendToLayMigrator}`, {
      lendTokenAddress,
      verify,
    });

    // The task will only initialize the proxy contract, not implementation
    await DRE.run(`initialize-${eContractid.LayToken}`, {
      admin: LayAdmin,
      onlyProxy: true,
    });

    // The task will only initialize the proxy contract, not implementation
    await DRE.run(`initialize-${eContractid.LendToLayMigrator}`, {
      admin: LayAdmin,
      onlyProxy: true,
    });

    console.log('\n✔️ Finished the deployment of the Lay Token Mainnet Enviroment. ✔️');
  });
