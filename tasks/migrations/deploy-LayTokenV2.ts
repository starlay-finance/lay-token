import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { eEthereumNetwork } from '../../helpers/types-common';
import { eContractid } from '../../helpers/types';
import { checkVerification } from '../../helpers/etherscan-verification';
import { getLayAdminPerNetwork } from '../../helpers/constants';

task('deploy-v2', 'Deployment of the Lay token V2')
  .addFlag('verify', 'Verify LayTokenV2 contract.')
  .setAction(async ({ verify }, localBRE) => {
    const DRE: HardhatRuntimeEnvironment = await localBRE.run('set-dre');
    const network = DRE.network.name as eEthereumNetwork;
    const layAdmin = getLayAdminPerNetwork(network);

    if (!layAdmin) {
      throw Error(
        'The --admin parameter must be set for mainnet network. Set an Ethereum address as --admin parameter input.'
      );
    }

    // If Etherscan verification is enabled, check needed environments to prevent loss of gas in failed deployments.
    if (verify) {
      checkVerification();
    }

    await DRE.run(`deploy-${eContractid.LayToken}`, { verify });

    console.log('\n✔️ Finished the deployment of the Lay Token V2 Mainnet Environment. ✔️');
  });
