import { task } from 'hardhat/config';
import {
  deployLayToken,
  deployInitializableAdminUpgradeabilityProxy,
  registerContractInJsonDb,
  getTokenVesting,
} from '../../helpers/contracts-helpers';
import { eContractid } from '../../helpers/types';

const { LayToken, LayTokenImpl } = eContractid;

task(`transfer-vesting-owner`, `transfer-vesting-owner`).setAction(async ({ verify }, localBRE) => {
  await localBRE.run('set-dre');

  if (!localBRE.network.config.chainId) {
    throw new Error('INVALID_CHAIN_ID');
  }

  console.log(`\n- Transfer vesting owner`);
  const vestingInstance = await getTokenVesting();
  console.log(`vesting address ${vestingInstance.address}`);
  const newOwner = '0xd5F44A9AB64320d0Dcf190c43CF40FCF2D8d9df1';
  console.log(`new owner ${newOwner}`);
  const tx = await vestingInstance.transferOwnership(newOwner);
  tx.wait(1);
  console.log('finished transfer ownership');
  console.log(tx);
});
