import { task } from 'hardhat/config';
import { eContractid } from '../../helpers/types';
import {
  getContract,
  getLendToLayMigrator,
  getLendToLayMigratorImpl,
} from '../../helpers/contracts-helpers';
import { waitForTx } from '../../helpers/misc-utils';

const { LendToLayMigrator } = eContractid;

task(`initialize-${LendToLayMigrator}`, `Initialize the ${LendToLayMigrator} proxy contract`)
  .addParam('admin', 'The address to be added as an Admin role in Lay Token Transparent Proxy.')
  .addFlag('onlyProxy', 'Initialize only the proxy contract, not the implementation contract')
  .setAction(async ({ admin: layAdmin, onlyProxy }, localBRE) => {
    await localBRE.run('set-dre');

    if (!layAdmin) {
      throw new Error(
        `Missing --admin parameter to add the Admin Role to ${LendToLayMigrator} Transparent Proxy`
      );
    }

    if (!localBRE.network.config.chainId) {
      throw new Error('INVALID_CHAIN_ID');
    }

    console.log(`\n- ${LendToLayMigrator} initialization`);

    const lendToLayMigratorImpl = await getLendToLayMigratorImpl();
    const lendToLayMigrator = await getLendToLayMigrator();

    const lendToLayMigratorProxy = await getContract(
      eContractid.InitializableAdminUpgradeabilityProxy,
      lendToLayMigrator.address
    );

    const lendToLayMigratorInitializeEncoded =
      lendToLayMigratorImpl.interface.encodeFunctionData('initialize');

    if (onlyProxy) {
      console.log(
        `\tWARNING: Not initializing the ${LendToLayMigrator} implementation, only set LAY_ADMIN to Transparent Proxy contract.`
      );
      await waitForTx(
        await lendToLayMigratorProxy.initialize(lendToLayMigratorImpl.address, layAdmin, '0x')
      );
      console.log(
        `\tFinished ${LendToLayMigrator} Proxy initialization, but not ${LendToLayMigrator} implementation.`
      );
      return;
    }

    console.log('\tInitializing LendToLayMigrator Proxy and Implementation ');

    await waitForTx(
      await lendToLayMigratorProxy.initialize(
        lendToLayMigratorImpl.address,
        layAdmin,
        lendToLayMigratorInitializeEncoded
      )
    );

    console.log('\tFinished LendToLayMigrator Proxy and Implementation initialization.');
  });
