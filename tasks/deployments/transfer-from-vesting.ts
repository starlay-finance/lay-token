import { Signer, Wallet } from 'ethers';
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
    const privateKey = process.env.VESTING_OWNER_PRIVATE_KEY || '';
    if (!privateKey) {
      throw new Error('INVALID_VESTING_OWNER_PRIVATE_KEY');
    }
    await localBRE.run('set-dre');

    if (!localBRE.network.config.chainId) {
      throw new Error('INVALID_CHAIN_ID');
    }

    console.log(`\n- Transfer LAY from vesting contract`);
    const vestingInstance = await getTokenVesting('0xebb855938652225212a7Dbd50Bd78Ba3e22d7B23');
    const wallet = new Wallet(privateKey);
    console.log(`vesting address ${vestingInstance.address}`);
    console.log(`owner address: ${wallet.address}`);
    const tx = await vestingInstance
      .connect(new Wallet(privateKey))
      .withdraw(parseEther('250000000'));
    tx.wait(1);
    console.log('finished transfer 250000000 $LAY');
    console.log(tx);
  }
);
