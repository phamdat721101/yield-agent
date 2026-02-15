// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IIdentityRegistry.sol";

/// @title IdentityRegistry — ERC-8004 Agent Identity as ERC-721
/// @notice Each AI agent is minted as an NFT. The token URI points to an AgentCard (JSON).
contract IdentityRegistry is ERC721, Ownable, IIdentityRegistry {
    uint256 private _nextId = 1;

    mapping(uint256 => string) private _agentURIs;
    mapping(uint256 => address) private _agentWallets;

    constructor() ERC721("LionHeart Agent", "LHA") Ownable(msg.sender) {}

    /// @notice Register a new agent — mints an NFT to the caller
    function register(string calldata agentURI) external returns (uint256 agentId) {
        agentId = _nextId++;
        _mint(msg.sender, agentId);
        _agentURIs[agentId] = agentURI;
        emit AgentRegistered(agentId, msg.sender, agentURI);
    }

    /// @notice Update metadata URI — only token owner
    function setMetadata(uint256 agentId, string calldata newURI) external {
        require(ownerOf(agentId) == msg.sender, "Not agent owner");
        _agentURIs[agentId] = newURI;
        emit MetadataUpdated(agentId, newURI);
    }

    /// @notice Bind an operational wallet to the agent — only token owner
    function setAgentWallet(uint256 agentId, address wallet) external {
        require(ownerOf(agentId) == msg.sender, "Not agent owner");
        _agentWallets[agentId] = wallet;
        emit AgentWalletSet(agentId, wallet);
    }

    function getAgentURI(uint256 agentId) external view returns (string memory) {
        _requireOwned(agentId);
        return _agentURIs[agentId];
    }

    function getAgentWallet(uint256 agentId) external view returns (address) {
        _requireOwned(agentId);
        return _agentWallets[agentId];
    }

    function totalAgents() external view returns (uint256) {
        return _nextId - 1;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return _agentURIs[tokenId];
    }
}
