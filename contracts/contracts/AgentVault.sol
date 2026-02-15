// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./YieldManager.sol";

/// @title AgentVault - Agentic Treasury & Payment System
/// @notice Stores user funds, earns yield, and allows agents to execute payments.
contract AgentVault is Ownable, AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");
    YieldManager public yieldManager;

    event Deposited(address indexed token, uint256 amount);
    event Withdrawn(address indexed token, uint256 amount);
    event PaymentExecuted(address indexed token, address indexed to, uint256 amount, bytes32 metadataHash);
    event YieldStrategyUpdated(address indexed newStrategy);

    constructor(address _yieldManager) Ownable(msg.sender) {
        yieldManager = YieldManager(_yieldManager);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @notice Deposit funds into the vault and auto-invest
    function deposit(address token, uint256 amount) external {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        // Auto-invest into yield strategy
        IERC20(token).approve(address(yieldManager), amount);
        yieldManager.invest(token, amount);

        emit Deposited(token, amount);
    }

    /// @notice Withdraw funds (Owner only)
    function withdraw(address token, uint256 amount) external onlyOwner {
        // Pull from yield strategy first
        yieldManager.divest(token, amount);
        IERC20(token).safeTransfer(msg.sender, amount);

        emit Withdrawn(token, amount);
    }

    /// @notice Execute a payment (Authorized Agents only) - x402 Support
    /// @param token Token to pay with
    /// @param to Recipient address
    /// @param amount Amount to pay
    /// @param metadataHash Hash of the payment details (e.g. invoice ID)
    function executePayment(
        address token, 
        address to, 
        uint256 amount, 
        bytes32 metadataHash
    ) external onlyRole(AGENT_ROLE) {
        // 1. Divest required amount from yield strategy
        yieldManager.divest(token, amount);

        // 2. Transfer to recipient
        IERC20(token).safeTransfer(to, amount);

        emit PaymentExecuted(token, to, amount, metadataHash);
    }

    /// @notice Update the yield strategy manager
    function setYieldStrategy(address _newManager) external onlyOwner {
        yieldManager = YieldManager(_newManager);
        emit YieldStrategyUpdated(_newManager);
    }

    /// @notice Grant an agent permission to spend
    function authorizeAgent(address agent) external onlyOwner {
        grantRole(AGENT_ROLE, agent);
    }

    /// @notice Revoke agent permission
    function deauthorizeAgent(address agent) external onlyOwner {
        revokeRole(AGENT_ROLE, agent);
    }
}
