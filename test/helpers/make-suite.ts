import { MockIncentivesController } from './../../types/MockIncentivesController.d';
import {
  getMockIncentivesController,
  getStarlayRewardsVault,
  getStarlayRewardsVaultProxy,
} from './../../helpers/contracts-helpers';
import { LayToken } from './../../types/LayToken.d';
import { evmRevert, evmSnapshot, DRE } from '../../helpers/misc-utils';
import { Signer } from 'ethers';
import {
  getEthersSigners,
  getLayToken,
  getMockTokenVesting,
  getMockTransferHook,
} from '../../helpers/contracts-helpers';
import { tEthereumAddress } from '../../helpers/types';

import chai from 'chai';
// @ts-ignore
import bignumberChai from 'chai-bignumber';
import { MockTransferHook } from '../../types/MockTransferHook';
import { MockTokenVesting } from '../../types/MockTokenVesting';
import { StarlayRewardsVault } from '../../types/StarlayRewardsVault';

chai.use(bignumberChai());

export interface SignerWithAddress {
  signer: Signer;
  address: tEthereumAddress;
}
export interface TestEnv {
  deployer: SignerWithAddress;
  users: SignerWithAddress[];
  layToken: LayToken;
  mockTransferHook: MockTransferHook;
  mockVesting: MockTokenVesting;
  rewardsVault: StarlayRewardsVault;
  mockIncentivesController: MockIncentivesController;
}

let buidlerevmSnapshotId: string = '0x1';
const setBuidlerevmSnapshotId = (id: string) => {
  if (DRE.network.name === 'hardhat') {
    buidlerevmSnapshotId = id;
  }
};

const testEnv: TestEnv = {
  deployer: {} as SignerWithAddress,
  users: [] as SignerWithAddress[],
  layToken: {} as LayToken,
  mockTransferHook: {} as MockTransferHook,
  mockVesting: {} as MockTokenVesting,
  mockIncentivesController: {} as MockIncentivesController,
} as TestEnv;

export async function initializeMakeSuite() {
  const [_deployer, ...restSigners] = await getEthersSigners();
  const deployer: SignerWithAddress = {
    address: await _deployer.getAddress(),
    signer: _deployer,
  };

  for (const signer of restSigners) {
    testEnv.users.push({
      signer,
      address: await signer.getAddress(),
    });
  }
  testEnv.deployer = deployer;
  testEnv.layToken = await getLayToken();
  testEnv.mockTransferHook = await getMockTransferHook();
  testEnv.mockVesting = await getMockTokenVesting();
  testEnv.rewardsVault = await getStarlayRewardsVault();
  testEnv.mockIncentivesController = await getMockIncentivesController();
}

export function makeSuite(name: string, tests: (testEnv: TestEnv) => void) {
  describe(name, () => {
    before(async () => {
      setBuidlerevmSnapshotId(await evmSnapshot());
    });
    tests(testEnv);
    after(async () => {
      await evmRevert(buidlerevmSnapshotId);
    });
  });
}
