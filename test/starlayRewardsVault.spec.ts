import { MockIncentivesController } from './../types/MockIncentivesController.d';
import { MockIncentivesController__factory } from './../types/factories/MockIncentivesController__factory';
import { Erc20__factory } from './../types/factories/Erc20__factory';
import {
  getLayToken,
  getInitializableAdminUpgradeabilityProxy,
} from './../helpers/contracts-helpers';
import { parseEther } from 'ethers/lib/utils';
import { TestEnv, makeSuite } from './helpers/make-suite';
import { getEthersSigners } from '../helpers/contracts-helpers';
import { ethers } from 'hardhat';

const { expect } = require('chai');

makeSuite('Starlay rewards vault', (testEnv: TestEnv) => {
  it('upgradeability', async () => {
    const { rewardsVault } = testEnv;
    const [newProxyAdmin, proxyAdmin] = await getEthersSigners();
    const proxyInstance = await (
      await getInitializableAdminUpgradeabilityProxy(rewardsVault.address)
    ).connect(proxyAdmin);
    proxyInstance.admin();
    await expect(proxyInstance.connect(newProxyAdmin).admin()).to.be.reverted;
    await proxyInstance.changeAdmin(await newProxyAdmin.getAddress());
    await proxyInstance.connect(newProxyAdmin).admin(); // not reverted
  });
  it('safeTransfer-call from incentivesController is enabled', async () => {
    const { rewardsVault, mockIncentivesController } = testEnv;
    const [user1] = await getEthersSigners();
    const layToken = await getLayToken(await mockIncentivesController._token());
    const vaultAssetBefore = await layToken.balanceOf(rewardsVault.address);
    const transferAmount = parseEther('1');
    await mockIncentivesController.transferFromVault(await user1.getAddress(), transferAmount);
    const vaultAssetAfter = await layToken.balanceOf(rewardsVault.address);
    expect(vaultAssetAfter).to.be.eq(vaultAssetBefore.sub(transferAmount));
  });
  it('safeTransfer-call from not allowed instance is disabled', async () => {
    const { rewardsVault, mockIncentivesController } = testEnv;
    const [user1] = await getEthersSigners();
    const layToken = await getLayToken(await mockIncentivesController._token());
    const dummyIncentivesController = (await ethers.getContractFactory(
      'MockIncentivesController'
    )) as MockIncentivesController__factory;
    const notAllowedInstance = await dummyIncentivesController.deploy(
      rewardsVault.address,
      layToken.address
    );
    await expect(
      notAllowedInstance.transferFromVault(await user1.getAddress(), parseEther('1'))
    ).to.be.revertedWith('SafeERC20: low-level call failed');
  });
});
