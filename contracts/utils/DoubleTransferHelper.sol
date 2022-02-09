// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.11;

import "../interfaces/IERC20.sol";

contract DoubleTransferHelper {

    IERC20 public immutable LAY;

    constructor(IERC20 lay) public {
        LAY = lay;
    }

    function doubleSend(address to, uint256 amount1, uint256 amount2) external {
        LAY.transfer(to, amount1);
        LAY.transfer(to, amount2);
    }
}