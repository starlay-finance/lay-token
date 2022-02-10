import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { eContractid } from '../../helpers/types';
import { getEthersSigners } from '../../helpers/contracts-helpers';
import { checkVerification } from '../../helpers/etherscan-verification';

task('dev-deployment', 'Deployment in hardhat')
  .addFlag('verify', 'Verify LayToken and InitializableAdminUpgradeabilityProxy contract.')
  .setAction(async ({ admin, verify }, localBRE) => {
    const DRE: HardhatRuntimeEnvironment = await localBRE.run('set-dre');

    // If admin parameter is NOT set, the Lay Admin will be the
    // second account provided via buidler config.
    const [, secondaryWallet] = await getEthersSigners();
    const LayAdmin = admin || (await secondaryWallet.getAddress());

    console.log('Lay ADMIN', LayAdmin);

    // If Etherscan verification is enabled, check needed enviroments to prevent loss of gas in failed deployments.
    if (verify) {
      checkVerification();
    }

    await DRE.run(`deploy-${eContractid.LayToken}`, { verify });

    await DRE.run(`initialize-${eContractid.LayToken}`, {
      admin: LayAdmin,
    });

    await DRE.run(`deploy-${eContractid.TokenVesting}`, {
      admin: LayAdmin,
    });

    console.log('\n👷 Finished the deployment of the Lay Token Development Enviroment. 👷');
  });
