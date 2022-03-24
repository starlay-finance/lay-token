// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {VersionedInitializable} from '../../utils/VersionedInitializable.sol';

contract StarlayRewardsVault is VersionedInitializable {
  uint256 public constant REVISION = 1;
  IERC20 public token;
  address public incentivesController;

  /**
   * @dev initializes the contract upon assignment to the InitializableAdminUpgradeabilityProxy
   * @param _token the address of the reward token
   * @param _incentivesController the address of the IncentivesController
   */
  function initialize(IERC20 _token, address _incentivesController) external initializer {
    token = _token;
    incentivesController = _incentivesController;
    _token.approve(_incentivesController, type(uint256).max);
  }

  /**
   * @dev returns the revision of the implementation contract
   */
  function getRevision() internal override pure returns (uint256) {
    return REVISION;
  }

}
