// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IIdentityRegistry {
    event AgentRegistered(uint256 indexed agentId, address indexed owner, string agentURI);
    event MetadataUpdated(uint256 indexed agentId, string newURI);
    event AgentWalletSet(uint256 indexed agentId, address wallet);

    function register(string calldata agentURI) external returns (uint256 agentId);
    function setMetadata(uint256 agentId, string calldata newURI) external;
    function setAgentWallet(uint256 agentId, address wallet) external;
    function getAgentURI(uint256 agentId) external view returns (string memory);
    function getAgentWallet(uint256 agentId) external view returns (address);
    function totalAgents() external view returns (uint256);
}
