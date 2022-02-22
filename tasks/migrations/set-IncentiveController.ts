import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { eEthereumNetwork } from '../../helpers/types-common';
import { getIncentiveControllerPerNetwork, getLayAdminPerNetwork } from '../../helpers/constants';
import { getStarlayRewardsVault } from '../../helpers/contracts-helpers';
require('dotenv').config();

task('set-incentiveController', 'Set IncentiveController to vault').setAction(async (localBRE) => {
  const DRE: HardhatRuntimeEnvironment = await localBRE.run('set-dre');
  const network = DRE.network.name as eEthereumNetwork;
  const incentiveController = getIncentiveControllerPerNetwork(network);
  const rewardsVault = await getStarlayRewardsVault();
  await rewardsVault.setIncentiveController(incentiveController);
  console.log('\n✔️ Finished Set incentive controller. ✔️');
});
