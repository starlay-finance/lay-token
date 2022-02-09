import { task } from 'hardhat/config';
import { eContractid } from '../../helpers/types';
import {
  registerContractInJsonDb,
  deployInitializableAdminUpgradeabilityProxy,
  getLendToken,
  deployMintableErc20,
  getLayToken,
  deployLendToLayMigrator,
} from '../../helpers/contracts-helpers';
import { verify } from 'crypto';

const { LendToLayMigrator, LendToLayMigratorImpl, MintableErc20 } = eContractid;

task(`deploy-${LendToLayMigrator}`, `Deploys ${LendToLayMigrator} contract`)
  .addOptionalParam(
    'lendTokenAddress',
    'The address of the LEND token. If not set, a mocked Mintable token will be deployed.'
  )
  .addFlag('verify', 'Proceed with the Etherscan verification')
  .setAction(async ({ lendTokenAddress, verify }, localBRE) => {
    await localBRE.run('set-dre');

    if (!localBRE.network.config.chainId) {
      throw new Error('INVALID_CHAIN_ID');
    }

    console.log(`\n- ${LendToLayMigrator} deployment`);

    if (!lendTokenAddress) {
      console.log(`\tDeploying ${MintableErc20} to mock LEND token...`);
      const mockedLend = await deployMintableErc20(['LEND token', 'LEND', 18]);
      await mockedLend.deployTransaction.wait();
    }

    const layTokenProxy = await getLayToken();
    const lendToken = lendTokenAddress || (await getLendToken()).address;

    console.log(`\tUsing ${lendToken} address for Lend Token input parameter`);

    console.log(`\tDeploying ${LendToLayMigrator} Implementation...`);

    const constructorParameters: [string, string, string] = [
      layTokenProxy.address,
      lendToken,
      '100',
    ];
    const lendToLayMigratorImpl = await deployLendToLayMigrator(constructorParameters, verify);
    await registerContractInJsonDb(LendToLayMigratorImpl, lendToLayMigratorImpl);

    console.log(`\tDeploying ${LendToLayMigrator} Transparent Proxy...`);

    const lendToLayMigratorProxy = await deployInitializableAdminUpgradeabilityProxy(verify);
    await registerContractInJsonDb(LendToLayMigrator, lendToLayMigratorProxy);

    console.log(`\tFinished ${LendToLayMigrator} proxy and implementation deployment`);
  });
