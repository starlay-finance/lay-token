// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.7.5;

import {IERC20} from "../interfaces/IERC20.sol";
import {SafeMath} from "../open-zeppelin/SafeMath.sol";
import {VersionedInitializable} from "../utils/VersionedInitializable.sol";


/**
* @title LendToLayMigrator
* @notice This contract implements the migration from LEND to LAY token
* @author Lay 
*/
contract LendToLayMigrator is VersionedInitializable {
    using SafeMath for uint256;

    IERC20 public immutable LAY;
    IERC20 public immutable LEND;
    uint256 public immutable LEND_LAY_RATIO;
    uint256 public constant REVISION = 1;
    
    uint256 public _totalLendMigrated;

    /**
    * @dev emitted on migration
    * @param sender the caller of the migration
    * @param amount the amount being migrated
    */
    event LendMigrated(address indexed sender, uint256 indexed amount);

    /**
    * @param lay the address of the LAY token
    * @param lend the address of the LEND token
    * @param lendLayRatio the exchange rate between LEND and LAY 
     */
    constructor(IERC20 lay, IERC20 lend, uint256 lendLayRatio) public {
        LAY = lay;
        LEND = lend;
        LEND_LAY_RATIO = lendLayRatio;
    }

    /**
    * @dev initializes the implementation
    */
    function initialize() public initializer {
    }

    /**
    * @dev returns true if the migration started
    */
    function migrationStarted() external view returns(bool) {
        return lastInitializedRevision != 0;
    }


    /**
    * @dev executes the migration from LEND to LAY. Users need to give allowance to this contract to transfer LEND before executing
    * this transaction.
    * @param amount the amount of LEND to be migrated
    */
    function migrateFromLEND(uint256 amount) external {
        require(lastInitializedRevision != 0, "MIGRATION_NOT_STARTED");

        _totalLendMigrated = _totalLendMigrated.add(amount);
        LEND.transferFrom(msg.sender, address(this), amount);
        LAY.transfer(msg.sender, amount.div(LEND_LAY_RATIO));
        emit LendMigrated(msg.sender, amount);
    }

    /**
    * @dev returns the implementation revision
    * @return the implementation revision
    */
    function getRevision() internal pure override returns (uint256) {
        return REVISION;
    }

}