import { createSchedulePerRole } from './../../helpers/vesting-helpers';
import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

import { eEthereumNetwork } from '../../helpers/types-common';
import { eContractid } from '../../helpers/types';
import { checkVerification } from '../../helpers/etherscan-verification';
import { getLayAdminPerNetwork } from '../../helpers/constants';
import {
  getEthersSigners,
  getTokenVesting,
  newVestingSchedule,
} from '../../helpers/contracts-helpers';
import { BigNumber } from 'ethers';
import { waitForTx } from '../../helpers/misc-utils';
import { parseEther } from 'ethers/lib/utils';
require('dotenv').config();

task('new-vesting', 'Register new vesting')
  .addParam('address', `The address to be added as an Vesting target]`)
  .addParam('role', `The role of the vesting target. allowed values: `)
  .addParam('amount', `The total amount of the vesting `)
  .addFlag('verify', 'Verify LayTokenV2 contract.')
  .setAction(async ({ address, role, amount }, localBRE) => {
    const amt = amount as string;
    const DRE: HardhatRuntimeEnvironment = await localBRE.run('set-dre');
    if (!BigNumber.isBigNumber(amt)) throw new Error(`${amount} is not BigNumber`);
    const vestingInstance = await getTokenVesting();
    const tx = await waitForTx(
      await newVestingSchedule(
        vestingInstance,
        createSchedulePerRole(role, address, parseEther(amt))
      )
    );
    console.log(tx);
    console.log('\n✔️ Finished the creation of the Vesting Schedule. ✔️');
  });
