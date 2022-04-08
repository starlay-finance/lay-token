import { TokenVesting__factory } from './../types/factories/TokenVesting__factory';
import { Token__factory } from './../types/factories/Token__factory';
import { Token } from './../types/Token.d';
import { ethers } from 'hardhat';
import {
  getCurrentBlock,
  getEthersSigners,
  newVestingSchedule,
} from '../helpers/contracts-helpers';
import { makeSuite, TestEnv } from './helpers/make-suite';
import { Signer } from 'ethers';
import { timestamp, createSchedulePerRole } from '../helpers/vesting-helpers';
import { parseEther } from 'ethers/lib/utils';
import { start } from 'repl';
import { zeroAddress } from 'ethereumjs-util';
import { ZERO_ADDRESS } from '../helpers/constants';

const { expect } = require('chai');
makeSuite('Delegation', (testEnv: TestEnv) => {
  let Token: Token__factory;
  let testToken: Token;
  let TokenVesting: TokenVesting__factory;
  let owner: Signer;
  let addr1: Signer;
  let addr2: Signer;

  before(async function () {
    Token = (await ethers.getContractFactory('Token')) as Token__factory;
    TokenVesting = (await ethers.getContractFactory('MockTokenVesting')) as TokenVesting__factory;
  });
  beforeEach(async function () {
    [owner, addr1, addr2] = await getEthersSigners();
    testToken = await Token.deploy('Test Token', 'TT', parseEther('700000000'));
    await testToken.deployed();
  });

  describe('Vesting', function () {
    it('Should assign the total supply of tokens to the owner', async function () {
      const ownerBalance = await testToken.balanceOf(await owner.getAddress());
      expect(await testToken.totalSupply()).to.equal(ownerBalance);
    });
    it('Should not be bested for zero_address', async function () {
      const tokenVesting = await TokenVesting.deploy(testToken.address);
      await tokenVesting.deployed();
      const baseTime = 1622551248;
      const startTime = baseTime;
      const cliff = 100;
      const duration = 1000;
      const slicePeriodSeconds = 1;
      const revocable = true;
      const amount = 100;
      await testToken.connect(owner).transfer(tokenVesting.address, 1000);
      await expect(
        tokenVesting.createVestingSchedule(
          ZERO_ADDRESS,
          startTime,
          cliff,
          duration,
          slicePeriodSeconds,
          revocable,
          amount
        )
      ).to.be.revertedWith('TokenVesting: benefiticary must not be empty');
    });
    it('Should vest tokens gradually', async function () {
      // deploy vesting contract
      const tokenVesting = await TokenVesting.deploy(testToken.address);
      await tokenVesting.deployed();
      expect((await tokenVesting.getToken()).toString()).to.equal(testToken.address);
      // send tokens to vesting contract
      await expect(testToken.connect(owner).transfer(tokenVesting.address, 1000))
        .to.emit(testToken, 'Transfer')
        .withArgs(await owner.getAddress(), tokenVesting.address, 1000);
      const vestingContractBalance = await testToken.balanceOf(tokenVesting.address);
      expect(vestingContractBalance).to.equal(1000);
      expect(await tokenVesting.getWithdrawableAmount()).to.equal(1000);

      const baseTime = 1622551248;
      const beneficiary = addr1;
      const startTime = baseTime;
      const cliff = 100;
      const duration = 1000;
      const slicePeriodSeconds = 1;
      const revocable = true;
      const amount = 100;
      console.log('createVestingSchedule');
      // create new vesting schedule
      const tx = await tokenVesting.createVestingSchedule(
        await beneficiary.getAddress(),
        startTime,
        cliff,
        duration,
        slicePeriodSeconds,
        revocable,
        amount
      );
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      const iface = new ethers.utils.Interface([
        'event ScheduleCreated(bytes32 vestingScheduleId,address beneficiary,uint256 start,uint256 cliff,uint256 duration,uint256 slicePeriodSeconds,bool revocable,uint256 amount)',
      ]);
      const data = receipt.logs[0].data;
      const topics = receipt.logs[0].topics;
      const event = iface.decodeEventLog('ScheduleCreated', data, topics);
      expect(event.beneficiary).to.equal(await beneficiary.getAddress());
      expect(event.start).to.equal(startTime);
      expect(event.cliff).to.equal(cliff + startTime);
      expect(event.duration).to.equal(duration);
      expect(event.slicePeriodSeconds).to.equal(slicePeriodSeconds);
      expect(event.revocable).to.equal(revocable);
      expect(event.amount).to.equal(amount);

      expect(await tokenVesting.getVestingSchedulesCount()).to.be.equal(1);
      expect(
        await tokenVesting.getVestingSchedulesCountByBeneficiary(await beneficiary.getAddress())
      ).to.be.equal(1);

      // compute vesting schedule id
      const vestingScheduleId = await tokenVesting.computeVestingScheduleIdForAddressAndIndex(
        await beneficiary.getAddress(),
        0
      );

      // check that vested amount is 0
      expect(await tokenVesting.computeReleasableAmount(vestingScheduleId)).to.be.equal(0);

      // set time to half the vesting period
      const halfTime = baseTime + duration / 2;
      await tokenVesting.setCurrentTime(halfTime);

      // check that vested amount is half the total amount to vest
      expect(
        await tokenVesting.connect(beneficiary).computeReleasableAmount(vestingScheduleId)
      ).to.be.equal(50);

      // check that only beneficiary can try to release vested tokens
      await expect(tokenVesting.connect(addr2).release(vestingScheduleId, 100)).to.be.revertedWith(
        'TokenVesting: only beneficiary and owner can release vested tokens'
      );

      // check that beneficiary cannot release more than the vested amount
      await expect(
        tokenVesting.connect(beneficiary).release(vestingScheduleId, 100)
      ).to.be.revertedWith('TokenVesting: cannot release tokens, not enough vested tokens');

      const releaseTx = tokenVesting.connect(beneficiary).release(vestingScheduleId, 10);
      // release 10 tokens and check that a Transfer event is emitted with a value of 10
      await expect(releaseTx)
        .to.emit(testToken, 'Transfer')
        .withArgs(tokenVesting.address, await beneficiary.getAddress(), 10);
      await expect(releaseTx).to.emit(tokenVesting, 'Released').withArgs(vestingScheduleId, 10);

      // check that the vested amount is now 40
      expect(
        await tokenVesting.connect(beneficiary).computeReleasableAmount(vestingScheduleId)
      ).to.be.equal(40);
      let vestingSchedule = await tokenVesting.getVestingSchedule(vestingScheduleId);

      // check that the released amount is 10
      expect(vestingSchedule.released).to.be.equal(10);

      // set current time after the end of the vesting period
      await tokenVesting.setCurrentTime(baseTime + duration + 1);

      // check that the vested amount is 90
      expect(
        await tokenVesting.connect(beneficiary).computeReleasableAmount(vestingScheduleId)
      ).to.be.equal(90);

      // beneficiary release vested tokens (45)
      await expect(tokenVesting.connect(beneficiary).release(vestingScheduleId, 45))
        .to.emit(testToken, 'Transfer')
        .withArgs(tokenVesting.address, await beneficiary.getAddress(), 45);

      // owner release vested tokens (45)
      await expect(tokenVesting.release(vestingScheduleId, 45))
        .to.emit(testToken, 'Transfer')
        .withArgs(tokenVesting.address, await beneficiary.getAddress(), 45);
      vestingSchedule = await tokenVesting.getVestingSchedule(vestingScheduleId);

      // check that the number of released tokens is 100
      expect(vestingSchedule.released).to.be.equal(100);

      // check that the vested amount is 0
      expect(
        await tokenVesting.connect(beneficiary).computeReleasableAmount(vestingScheduleId)
      ).to.be.equal(0);
      console.log('revoke');

      // check that anyone cannot revoke a vesting
      await expect(tokenVesting.connect(addr2).revoke(vestingScheduleId)).to.be.revertedWith(
        'Ownable: caller is not the owner'
      );
      console.log('revoke owner');

      expect(await tokenVesting.connect(owner).revoke(vestingScheduleId))
        .to.emit(tokenVesting, 'Revoked')
        .withArgs(vestingScheduleId);

      /*
       * TEST SUMMARY
       * deploy vesting contract
       * send tokens to vesting contract
       * create new vesting schedule (100 tokens)
       * check that vested amount is 0
       * set time to half the vesting period
       * check that vested amount is half the total amount to vest (50 tokens)
       * check that only beneficiary can try to release vested tokens
       * check that beneficiary cannot release more than the vested amount
       * release 10 tokens and check that a Transfer event is emitted with a value of 10
       * check that the released amount is 10
       * check that the vested amount is now 40
       * set current time after the end of the vesting period
       * check that the vested amount is 90 (100 - 10 released tokens)
       * release all vested tokens (90)
       * check that the number of released tokens is 100
       * check that the vested amount is 0
       * check that anyone cannot revoke a vesting
       */
    });

    it('Should release vested tokens if revoked', async function () {
      // deploy vesting contract
      const tokenVesting = await TokenVesting.deploy(testToken.address);
      await tokenVesting.deployed();
      expect((await tokenVesting.getToken()).toString()).to.equal(testToken.address);
      // send tokens to vesting contract
      await expect(testToken.transfer(tokenVesting.address, 1000))
        .to.emit(testToken, 'Transfer')
        .withArgs(await owner.getAddress(), tokenVesting.address, 1000);

      const baseTime = 1622551248;
      const beneficiary = addr1;
      const startTime = baseTime;
      const cliff = 0;
      const duration = 1000;
      const slicePeriodSeconds = 1;
      const revokable = true;
      const amount = 100;

      // create new vesting schedule
      await tokenVesting.createVestingSchedule(
        await beneficiary.getAddress(),
        startTime,
        cliff,
        duration,
        slicePeriodSeconds,
        revokable,
        amount
      );

      // compute vesting schedule id
      const vestingScheduleId = await tokenVesting.computeVestingScheduleIdForAddressAndIndex(
        await beneficiary.getAddress(),
        0
      );

      // set time to half the vesting period
      const halfTime = baseTime + duration / 2;
      await tokenVesting.setCurrentTime(halfTime);

      await expect(tokenVesting.revoke(vestingScheduleId))
        .to.emit(testToken, 'Transfer')
        .withArgs(tokenVesting.address, await beneficiary.getAddress(), 50);
    });

    it('Should compute vesting schedule index', async function () {
      const tokenVesting = await TokenVesting.deploy(testToken.address);
      await tokenVesting.deployed();
      const expectedVestingScheduleId =
        '0xa8909b0a2e8f76be8065132f39e600bec192b207b7d16b11104c07ed081cb681';
      expect(
        (
          await tokenVesting.computeVestingScheduleIdForAddressAndIndex(await addr1.getAddress(), 0)
        ).toString()
      ).to.equal(expectedVestingScheduleId);
      expect(
        (
          await tokenVesting.computeNextVestingScheduleIdForHolder(await addr1.getAddress())
        ).toString()
      ).to.equal(expectedVestingScheduleId);
    });

    it('Should check input parameters for createVestingSchedule method', async function () {
      const tokenVesting = await TokenVesting.deploy(testToken.address);
      await tokenVesting.deployed();
      await testToken.transfer(tokenVesting.address, 1000);
      const time = Date.now();
      await expect(
        tokenVesting.createVestingSchedule(await addr1.getAddress(), time, 0, 0, 1, false, 1)
      ).to.be.revertedWith('TokenVesting: duration must be > 0');
      await expect(
        tokenVesting.createVestingSchedule(await addr1.getAddress(), time, 0, 1, 0, false, 1)
      ).to.be.revertedWith('TokenVesting: slicePeriodSeconds must be >= 1');
      await expect(
        tokenVesting.createVestingSchedule(await addr1.getAddress(), time, 0, 1, 1, false, 0)
      ).to.be.revertedWith('TokenVesting: amount must be > 0');
    });
    it('Should check allocation per month for investor', async function () {
      const tokenVesting = await TokenVesting.deploy(testToken.address);
      await tokenVesting.deployed();
      const amountTotal = parseEther('20000000');
      const perMonth = amountTotal.div(18);
      await testToken.transfer(tokenVesting.address, amountTotal);
      const investor = await addr1.getAddress();
      await newVestingSchedule(
        tokenVesting,
        createSchedulePerRole('investor', investor, amountTotal)
      );
      const schedule = await tokenVesting.getVestingIdAtIndex(0);
      await tokenVesting.setCurrentTime(timestamp(new Date(Date.UTC(2022, 9 - 1, 1))));
      // before the cliff
      expect(await tokenVesting.computeReleasableAmount(schedule)).to.eq('0');
      // 1 month later
      await tokenVesting.setCurrentTime(timestamp(new Date(Date.UTC(2022, 10 - 1, 1, 0, 0, 0))));
      expect(await tokenVesting.computeReleasableAmount(schedule)).to.eq(perMonth);
      // 2 month later
      await tokenVesting.setCurrentTime(timestamp(new Date(Date.UTC(2022, 10 - 1, 31, 0, 0, 0))));
      expect(await tokenVesting.computeReleasableAmount(schedule)).to.eq(perMonth.mul(2));
      // schedule finished
      await tokenVesting.setCurrentTime(timestamp(new Date(Date.UTC(2024, 3 - 1, 1, 0, 0, 0))));
      expect(await tokenVesting.computeReleasableAmount(schedule)).to.eq(amountTotal);
    });
    it('Should check allocation per month for early contributor', async function () {
      const tokenVesting = await TokenVesting.deploy(testToken.address);
      await tokenVesting.deployed();
      const amountTotal = parseEther('100000000');
      const perMonth = amountTotal.div(18);
      await testToken.transfer(tokenVesting.address, amountTotal);
      const investor = await addr1.getAddress();
      await newVestingSchedule(
        tokenVesting,
        createSchedulePerRole('earlyContributor', investor, amountTotal)
      );
      const schedule = await tokenVesting.getVestingIdAtIndex(0);
      await tokenVesting.setCurrentTime(timestamp(new Date(Date.UTC(2022, 9 - 1, 1))));
      // before the cliff
      expect(await tokenVesting.computeReleasableAmount(schedule)).to.eq('0');
      // 1 month later
      await tokenVesting.setCurrentTime(timestamp(new Date(Date.UTC(2022, 10 - 1, 1, 0, 0, 0))));
      expect(await tokenVesting.computeReleasableAmount(schedule)).to.eq(perMonth);
      // 2 month later
      await tokenVesting.setCurrentTime(timestamp(new Date(Date.UTC(2022, 10 - 1, 31, 0, 0, 0))));
      expect(await tokenVesting.computeReleasableAmount(schedule)).to.eq(perMonth.mul(2).add(1));
      // schedule finished
      await tokenVesting.setCurrentTime(timestamp(new Date(Date.UTC(2024, 3 - 1, 1, 0, 0, 0))));
      expect(await tokenVesting.computeReleasableAmount(schedule)).to.eq(amountTotal);
    });
    it('Should check allocation per month for team', async function () {
      const tokenVesting = await TokenVesting.deploy(testToken.address);
      await tokenVesting.deployed();
      const amountTotal = parseEther('25000000');
      const per2Month = amountTotal.div(3);
      await testToken.transfer(tokenVesting.address, amountTotal);
      const investor = await addr1.getAddress();
      await newVestingSchedule(tokenVesting, createSchedulePerRole('team', investor, amountTotal));
      const schedule = await tokenVesting.getVestingIdAtIndex(0);
      // before the cliff
      await tokenVesting.setCurrentTime(timestamp(new Date(Date.UTC(2022, 3 - 1, 1))));
      expect(await tokenVesting.computeReleasableAmount(schedule)).to.eq('0');
      // at 2 Apr. 2022
      await tokenVesting.setCurrentTime(timestamp(new Date(Date.UTC(2022, 4 - 1, 2, 0, 0, 0))));
      expect(await tokenVesting.computeReleasableAmount(schedule)).to.eq(per2Month);
      // schedule finished
      await tokenVesting.setCurrentTime(timestamp(new Date(Date.UTC(2022, 8 - 1, 1, 0, 0, 0))));
      expect(await tokenVesting.computeReleasableAmount(schedule)).to.eq(amountTotal);
    });
  });
});
