import { task } from 'hardhat/config';
import { deployLayTokenV2, registerContractInJsonDb } from '../../helpers/contracts-helpers';
import { eContractid } from '../../helpers/types';

const { LayTokenV2, LayTokenImpl } = eContractid;

task(`deploy-${LayTokenV2}`, `Deploys the ${LayTokenV2} contract`)
  .addFlag('verify', 'Proceed with the Etherscan verification')
  .setAction(async ({ verify }, localBRE) => {
    await localBRE.run('set-dre');

    if (!localBRE.network.config.chainId) {
      throw new Error('INVALID_CHAIN_ID');
    }

    console.log(`\n- ${LayTokenV2} deployment`);

    console.log(`\tDeploying ${LayTokenV2} implementation ...`);
    const layTokenImpl = await deployLayTokenV2(verify);
    await registerContractInJsonDb(LayTokenImpl, layTokenImpl);

    console.log(`\tFinished ${LayTokenV2} proxy and implementation deployment`);
  });
