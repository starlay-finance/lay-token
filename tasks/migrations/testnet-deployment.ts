import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { eContractid } from '../../helpers/types';
import { eEthereumNetwork } from '../../helpers/types-common';
import { getLayAdminPerNetwork } from '../../helpers/constants';
import { checkVerification } from '../../helpers/etherscan-verification';
require('dotenv').config();

task('testnet-deployment', 'Deployment in shiden network')
  .addFlag(
    'verify',
    'Verify LayToken, TokenVesting and InitializableAdminUpgradeabilityProxy contract.'
  )
  .setAction(async ({ verify }, localBRE) => {
    const DRE: HardhatRuntimeEnvironment = await localBRE.run('set-dre');
    const network = DRE.network.name as eEthereumNetwork;
    const LayAdmin = getLayAdminPerNetwork(network);

    if (!LayAdmin) {
      throw Error(
        'The --admin parameter must be set for shiden network. Set an Ethereum address as --admin parameter input.'
      );
    }

    // If Etherscan verification is enabled, check needed enviroments to prevent loss of gas in failed deployments.
    if (verify) {
      checkVerification();
    }

    console.log('Lay ADMIN', LayAdmin);
    await DRE.run(`deploy-${eContractid.LayToken}`, { verify });
    await DRE.run(`deploy-${eContractid.TokenVesting}`, { verify });
    await DRE.run(`deploy-${eContractid.StarlayRewardsVault}`, {});
    await DRE.run(`initialize-${eContractid.LayToken}`, {
      admin: LayAdmin,
      verify,
    });

    console.log('\n✔️  Finished the deployment of the Lay Token Testnet Enviroment. ✔️');
  });
