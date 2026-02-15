// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title YieldManager - Mock Yield Strategy for AgentVault
/// @notice Simulates yield generation (e.g., 5% APY) for testing.
contract YieldManager is Ownable {
    using SafeERC20 for IERC20;

    // Track principal deposited per user/vault
    mapping(address => mapping(address => uint256)) public principal;
    // Track simulated yield "points" or value
    mapping(address => mapping(address => uint256)) public yield_simulated;

    event Invested(address indexed vault, address indexed token, uint256 amount);
    event Divested(address indexed vault, address indexed token, uint256 amount);

    constructor() Ownable(msg.sender) {}

    /// @notice Invests funds into the strategy (Mock: just holds them)
    function invest(address token, uint256 amount) external {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        principal[msg.sender][token] += amount;
        
        // Simulating yield accrual by tracking timestamp (simplified)
        // In a real strategy, this would interact with Aave/Compound
        
        emit Invested(msg.sender, token, amount);
    }

    /// @notice Withdraws funds from the strategy
    function divest(address token, uint256 amount) external returns (uint256) {
        require(principal[msg.sender][token] >= amount, "Insufficient principal");
        
        principal[msg.sender][token] -= amount;
        IERC20(token).safeTransfer(msg.sender, amount);
        
        emit Divested(msg.sender, token, amount);
        return amount;
    }

    /// @notice Returns the total balance (Principal + Simulated Yield)
    function getBalance(address vault, address token) external view returns (uint256) {
        // Mock calculation: Principal + 5% (simulated)
        // For MVP, just return principal to avoid oracle complexity
        return principal[vault][token];
    }
}
