import { InitializableAdminUpgradeabilityProxy__factory } from '../../types/factories/InitializableAdminUpgradeabilityProxy__factory';
import { task } from 'hardhat/config';
import {
  deployLayToken,
  deployInitializableAdminUpgradeabilityProxy,
  registerContractInJsonDb,
  getTokenVesting,
  getLayToken,
  getEthersSigners,
  getContract,
} from '../../helpers/contracts-helpers';
import { eContractid } from '../../helpers/types';

const { LayToken, LayTokenImpl } = eContractid;

task(`change-lay-admin`, `change-lay-admin`).setAction(async ({ verify }, localBRE) => {
  await localBRE.run('set-dre');

  if (!localBRE.network.config.chainId) {
    throw new Error('INVALID_CHAIN_ID');
  }
  console.log(`\n- Transfer lay admin`);
  const signer = (await getEthersSigners())[7];
  console.log('signer: ', await signer.getAddress());
  const proxyInstance = await getContract(
    eContractid.InitializableAdminUpgradeabilityProxy,
    '0xc4335B1b76fA6d52877b3046ECA68F6E708a27dd'
  );
  console.log('current admin:', await (await proxyInstance.connect(signer)).admin());
  console.log('signer: ', await signer.getAddress());
  console.log(`lay poxy address ${proxyInstance.address}`);
  const newAdmin = '0x80a476C2c37eA200fD2Fa7Dd549BB2240f161Ff5';
  console.log(`new admin ${newAdmin}`);
  //const tx = await (await proxyInstance.connect(signer)).changeAdmin(newAdmin);
  //console.log('finished transfer admin permission');
  //console.log(tx);
});
