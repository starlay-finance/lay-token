import rawBRE from 'hardhat';
import { expect } from 'chai';
import { TestEnv, makeSuite } from './helpers/make-suite';
import { ProtocolErrors, eContractid } from '../helpers/types';
import { getContract } from '../helpers/contracts-helpers';
import BigNumber from 'bignumber.js';

makeSuite('LEND migrator', (testEnv: TestEnv) => {
  const {} = ProtocolErrors;

  it('Check the constructor is executed properly', async () => {
    const { lendToLayMigrator, layToken, lendToken } = testEnv;

    expect(await lendToLayMigrator.LAY()).to.be.equal(layToken.address, 'Invalid LAY Address');

    expect(await lendToLayMigrator.LEND()).to.be.equal(lendToken.address, 'Invalid LEND address');

    expect(await lendToLayMigrator.LEND_LAY_RATIO()).to.be.equal('1000', 'Invalid ratio');
  });

  it("Check migration isn't started", async () => {
    const { lendToLayMigrator, lendToLayMigratorImpl } = testEnv;

    const migrationStarted = await lendToLayMigrator.migrationStarted();

    expect(migrationStarted.toString()).to.be.eq('false');
    await expect(lendToLayMigrator.migrateFromLEND('1000')).to.be.revertedWith(
      'MIGRATION_NOT_STARTED'
    );
  });

  it('Starts the migration', async () => {
    const { lendToLayMigrator, lendToLayMigratorImpl } = testEnv;

    const lendToLayMigratorInitializeEncoded =
      lendToLayMigratorImpl.interface.encodeFunctionData('initialize');

    const migratorAsProxy = await getContract(
      eContractid.InitializableAdminUpgradeabilityProxy,
      lendToLayMigrator.address
    );

    await migratorAsProxy
      .connect(testEnv.users[0].signer)
      .upgradeToAndCall(lendToLayMigratorImpl.address, lendToLayMigratorInitializeEncoded);

    const migrationStarted = await lendToLayMigrator.migrationStarted();

    expect(migrationStarted.toString()).to.be.eq('true');
  });

  it('Migrates 1000 LEND', async () => {
    const { lendToLayMigrator, lendToken, layToken } = testEnv;
    const user = testEnv.users[2];

    const lendBalance = new BigNumber(1000).times(new BigNumber(10).pow(18)).toFixed(0);
    const expectedlayBalanceAfterMigration = new BigNumber(10).pow(18);

    await lendToken.connect(user.signer).mint(lendBalance);

    await lendToken.connect(user.signer).approve(lendToLayMigrator.address, lendBalance);

    await lendToLayMigrator.connect(user.signer).migrateFromLEND(lendBalance);

    const lendBalanceAfterMigration = await lendToken.balanceOf(user.address);
    const layBalanceAfterMigration = await layToken.balanceOf(user.address);

    expect(lendBalanceAfterMigration.toString()).to.be.eq('0');
    expect(layBalanceAfterMigration.toString()).to.be.eq(
      expectedlayBalanceAfterMigration.toFixed(0)
    );
  });
});
