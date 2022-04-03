import BigNumber from 'bignumber.js';
import { eEthereumNetwork } from './types-common';

export enum eContractid {
  LayToken = 'LayToken',
  LayTokenV2 = 'LayTokenV2',
  LayTokenImpl = 'LayTokenImpl',
  IERC20Detailed = 'IERC20Detailed',
  AdminUpgradeabilityProxy = 'AdminUpgradeabilityProxy',
  InitializableAdminUpgradeabilityProxy = 'InitializableAdminUpgradeabilityProxy',
  MintableErc20 = 'MintableErc20',
  DoubleTransferHelper = 'DoubleTransferHelper',
  MockTransferHook = 'MockTransferHook',
  TokenVesting = 'TokenVesting',
  MockTokenVesting = 'MockTokenVesting',
  MockIncentivesController = 'MockIncentivesController',
  StarlayRewardsVault = 'StarlayRewardsVault',
  StarlayRewardsVaultImpl = 'StarlayRewardsVaultImpl',
  StarlayRewardsVaultProxy = 'StarlayRewardsVaultProxy',
}

export enum ProtocolErrors {}

export type tEthereumAddress = string;
export type tStringTokenBigUnits = string; // 1 ETH, or 10e6 USDC or 10e18 DAI
export type tBigNumberTokenBigUnits = BigNumber;
export type tStringTokenSmallUnits = string; // 1 wei, or 1 basic unit of USDC, or 1 basic unit of DAI
export type tBigNumberTokenSmallUnits = BigNumber;

export interface iParamsPerNetwork<T> {
  [eEthereumNetwork.coverage]: T;
  [eEthereumNetwork.hardhat]: T;
  [eEthereumNetwork.kovan]: T;
  [eEthereumNetwork.shibuya]: T;
  [eEthereumNetwork.shiden]: T;
  [eEthereumNetwork.astar]: T;
}
