import { task } from 'hardhat/config';
import { getStarlayRewardsVault } from '../../helpers/contracts-helpers';

task(`transfer-ownership-of-vault`, `change-lay-admin`).setAction(async ({ verify }, localBRE) => {
  await localBRE.run('set-dre');

  if (!localBRE.network.config.chainId) {
    throw new Error('INVALID_CHAIN_ID');
  }
  console.log(`\n- Transfer lay admin`);
  const rewardsVaultInstance = await getStarlayRewardsVault();
  const newEmissionManger = '0xed81c007113D8E532954B735B683260776F3c297';
  console.log('current owner:', await rewardsVaultInstance.owner());
  console.log('new owner:', newEmissionManger);
  const tx = await rewardsVaultInstance.transferOwnership(newEmissionManger);
  tx.wait(1);
  console.log('ownership transferred at', tx.hash);
});
