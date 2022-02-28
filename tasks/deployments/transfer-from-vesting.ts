import { parseEther } from 'ethers/lib/utils';
import { task } from 'hardhat/config';
import {
  deployLayToken,
  deployInitializableAdminUpgradeabilityProxy,
  registerContractInJsonDb,
  getTokenVesting,
} from '../../helpers/contracts-helpers';
import { eContractid } from '../../helpers/types';

const { LayToken, LayTokenImpl } = eContractid;

task(`transfer-from-vesting`, `transfer amount from vesting`).setAction(
  async ({ verify }, localBRE) => {
    await localBRE.run('set-dre');

    if (!localBRE.network.config.chainId) {
      throw new Error('INVALID_CHAIN_ID');
    }

    console.log(`\n- Transfer vesting owner`);
    const vestingInstance = await getTokenVesting('0xebb855938652225212a7Dbd50Bd78Ba3e22d7B23');
    console.log(`vesting address ${vestingInstance.address}`);
    const tx = await vestingInstance.withdraw(parseEther('250000000'));
    tx.wait(1);
    console.log('finished transfer 250000000 $LAY');
    console.log(tx);
  }
);
