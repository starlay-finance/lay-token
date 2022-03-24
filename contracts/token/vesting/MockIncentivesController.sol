// contracts/TokenVesting.sol
// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.11;

import "../../open-zeppelin/SafeERC20.sol";

/**
 * @title MockTokenVesting
 * WARNING: use only for testing and debugging purpose
 */
contract MockIncentivesController {
  using SafeERC20 for IERC20;

    address public _vault;
    IERC20 public _token;

    constructor(address vault, address token) {
        _vault = vault;
        _token = IERC20(token);
    }

    function transferFromVault(address recipient, uint256 amount) public {
        _token.safeTransferFrom(_vault, recipient, amount);
    }

}