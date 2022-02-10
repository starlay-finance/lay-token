import { task } from 'hardhat/config';
import { eContractid } from '../../helpers/types';
import {
  deployVesting,
  getContract,
  getLayToken,
  registerContractInJsonDb,
} from '../../helpers/contracts-helpers';
import { InitializableAdminUpgradeabilityProxy } from '../../types/InitializableAdminUpgradeabilityProxy';

const { TokenVesting } = eContractid;

task(`deploy-${TokenVesting}`, `Deploy the ${TokenVesting} contract`)
  .addFlag('verify', 'Proceed with the Etherscan verification')
  .setAction(async ({ verify }, localBRE) => {
    await localBRE.run('set-dre');

    if (!localBRE.network.config.chainId) {
      throw new Error('INVALID_CHAIN_ID');
    }

    console.log(`\n- ${TokenVesting} deployment`);
    const layToken = await getLayToken();
    const layTokenProxy = await getContract<InitializableAdminUpgradeabilityProxy>(
      eContractid.InitializableAdminUpgradeabilityProxy,
      layToken.address
    );

    const tokenVesting = await deployVesting(layTokenProxy.address, verify);
    await registerContractInJsonDb(TokenVesting, tokenVesting);

    console.log('\tFinished TokenVesting Implementation deployment.');
  });
