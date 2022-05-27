import { task } from 'hardhat/config';
import { deployLayTokenV3, registerContractInJsonDb } from '../../helpers/contracts-helpers';
import { eContractid } from '../../helpers/types';

const { LayTokenV3, LayTokenImpl } = eContractid;

task(`deploy-LayTokenV3`, `Deploys the LayTokenV3 contract`)
  .addFlag('verify', 'Proceed with the Etherscan verification')
  .setAction(async ({ verify }, localBRE) => {
    await localBRE.run('set-dre');

    if (!localBRE.network.config.chainId) {
      throw new Error('INVALID_CHAIN_ID');
    }

    console.log(`\n- LayTokenV3 deployment`);

    console.log(`\tDeploying LayTokenV3 implementation ...`);
    const layTokenImpl = await deployLayTokenV3(verify);
    await registerContractInJsonDb(LayTokenV3, layTokenImpl);

    console.log(`\tFinished LayTokenV3 proxy and implementation deployment`);
  });
