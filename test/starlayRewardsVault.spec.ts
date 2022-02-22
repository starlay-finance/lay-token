import { parseEther } from 'ethers/lib/utils';
import { TestEnv, makeSuite } from './helpers/make-suite';

const { expect } = require('chai');

makeSuite('Starlay rewards vault', (testEnv: TestEnv) => {
  it('Deployer can set incentives controller', async () => {
    const { rewardsVault, deployer: owner, users } = testEnv;
    const mockAddress = users[2].address;
    await rewardsVault.connect(owner.signer).setIncentiveController(mockAddress);
    expect(await rewardsVault.incentiveController()).equals(mockAddress);
  });
  it('ownership transfer enabled', async () => {
    const { rewardsVault, deployer: owner, users } = testEnv;
    const newOwner = users[2];
    const mockAddress = users[3].address;
    await rewardsVault.connect(owner.signer).transferOwnership(newOwner.address);
    expect(await rewardsVault.owner()).equals(newOwner.address);
    await expect(rewardsVault.connect(owner.signer).setIncentiveController(newOwner.address)).to.be
      .reverted;
    await rewardsVault.connect(newOwner.signer).setIncentiveController(mockAddress);
    expect(await rewardsVault.incentiveController()).equals(mockAddress);
  });
  it('token transfer to incentiveController enabled', async () => {
    const { rewardsVault, users, layToken } = testEnv;
    const currentOwner = users[2];
    const incentiveControllerMock = users[3].address;
    const amountWant = parseEther('1000');
    await rewardsVault.connect(currentOwner.signer).setIncentiveController(incentiveControllerMock);
    await rewardsVault.connect(currentOwner.signer).transfer(layToken.address, amountWant);
    expect(await layToken.balanceOf(incentiveControllerMock)).equals(amountWant);
  });
});
