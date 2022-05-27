import { InitializableAdminUpgradeabilityProxy } from '../../types/InitializableAdminUpgradeabilityProxy';
import { task } from 'hardhat/config';
import { eContractid } from '../../helpers/types';
import { getLayToken, getContract, getLayTokenV3 } from '../../helpers/contracts-helpers';
import { Wallet } from 'ethers';
import { JsonRpcProvider } from '@ethersproject/providers';

const { LayToken, LayTokenV3 } = eContractid;

task(`upgrade-${LayTokenV3}`, `Initialize the ${LayTokenV3} proxy contract`).setAction(
  async ({}, localBRE) => {
    await localBRE.run('set-dre');
    const LAY_ADMIN_PRIVATE_KEY = process.env.LAY_ADMIN_PRIVATE_KEY || '';
    const admin = new Wallet(
      LAY_ADMIN_PRIVATE_KEY,
      new JsonRpcProvider('https://astar.public.blastapi.io')
    );

    if (!LAY_ADMIN_PRIVATE_KEY) {
      throw new Error(
        `Missing layAdmin Private key parameter to upgrade ${LayToken} Transparent Proxy`
      );
    }

    if (!localBRE.network.config.chainId) {
      throw new Error('INVALID_CHAIN_ID');
    }

    console.log(`\n- ${LayTokenV3} initialization`);

    const layTokenV3 = await getLayTokenV3('0x2d10e23201861AFCa95Af0126d79C5a4D1bd277d');
    const layToken = await getLayToken('0xc4335B1b76fA6d52877b3046ECA68F6E708a27dd');
    const layTokenProxy = await getContract<InitializableAdminUpgradeabilityProxy>(
      eContractid.InitializableAdminUpgradeabilityProxy,
      layToken.address
    );
    const encodedInitialize = await layTokenV3.interface.encodeFunctionData('initialize');
    layTokenProxy.connect(admin).upgradeToAndCall(layTokenV3.address, encodedInitialize);

    console.log('\tFinished Lay Token upgrade to V3');
  }
);
