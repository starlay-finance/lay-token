import { task } from 'hardhat/config';
import {
  deployLayToken,
  deployInitializableAdminUpgradeabilityProxy,
  registerContractInJsonDb,
} from '../../helpers/contracts-helpers';
import { eContractid } from '../../helpers/types';

const { LayToken, LayTokenImpl } = eContractid;

task(`deploy-${LayToken}`, `Deploys the ${LayToken} contract`)
  .addFlag('verify', 'Proceed with the Etherscan verification')
  .setAction(async ({ verify }, localBRE) => {
    await localBRE.run('set-dre');

    if (!localBRE.network.config.chainId) {
      throw new Error('INVALID_CHAIN_ID');
    }

    console.log(`\n- ${LayToken} deployment`);

    console.log(`\tDeploying ${LayToken} implementation ...`);
    const layTokenImpl = await deployLayToken(verify);
    await registerContractInJsonDb(LayTokenImpl, layTokenImpl);

    console.log(`\tDeploying ${LayToken} Transparent Proxy ...`);
    const layTokenProxy = await deployInitializableAdminUpgradeabilityProxy(verify);
    await registerContractInJsonDb(LayToken, layTokenProxy);

    console.log(`\tFinished ${LayToken} proxy and implementation deployment`);
  });
