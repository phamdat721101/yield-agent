// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./interfaces/IReputationRegistry.sol";

/// @title ReputationRegistry — On-chain feedback and reputation scoring for agents
/// @notice Anyone can give feedback to an agent. Self-feedback is blocked via ownerOf check.
contract ReputationRegistry is IReputationRegistry {
    IERC721 public immutable identityRegistry;

    // agentId => Feedback[]
    mapping(uint256 => Feedback[]) private _feedbacks;

    constructor(address _identityRegistry) {
        identityRegistry = IERC721(_identityRegistry);
    }

    /// @notice Submit feedback for an agent
    /// @param agentId The agent's NFT token ID
    /// @param value Score value (e.g. 85 with decimals=0 means 85; 850 with decimals=1 means 85.0)
    /// @param decimals Decimal places for the value
    /// @param tag1 Primary category tag (e.g. "accuracy")
    /// @param tag2 Secondary category tag (e.g. "speed")
    /// @param endpointURI URI of the interaction endpoint being rated
    /// @param payloadHash SHA-256 hash of the interaction payload for verifiability
    function giveFeedback(
        uint256 agentId,
        uint256 value,
        uint8 decimals,
        bytes32 tag1,
        bytes32 tag2,
        string calldata endpointURI,
        bytes32 payloadHash
    ) external {
        // Agent must exist
        address agentOwner = identityRegistry.ownerOf(agentId);

        // Prevent self-feedback
        require(msg.sender != agentOwner, "Cannot rate own agent");

        _feedbacks[agentId].push(
            Feedback({
                reviewer: msg.sender,
                agentId: agentId,
                value: value,
                decimals: decimals,
                tag1: tag1,
                tag2: tag2,
                endpointURI: endpointURI,
                payloadHash: payloadHash,
                timestamp: block.timestamp
            })
        );

        emit FeedbackGiven(agentId, msg.sender, value, tag1, tag2);
    }

    /// @notice Get aggregated reputation summary for an agent
    function getSummary(uint256 agentId) external view returns (ReputationSummary memory) {
        Feedback[] storage feedbacks = _feedbacks[agentId];
        uint256 count = feedbacks.length;

        if (count == 0) {
            return ReputationSummary({ feedbackCount: 0, aggregatedScore: 0, decimals: 0 });
        }

        uint256 totalScore;
        uint8 maxDecimals;
        for (uint256 i = 0; i < count; i++) {
            // Normalize to the highest decimal precision seen
            if (feedbacks[i].decimals > maxDecimals) {
                maxDecimals = feedbacks[i].decimals;
            }
        }

        for (uint256 i = 0; i < count; i++) {
            uint256 normalized = feedbacks[i].value * (10 ** (maxDecimals - feedbacks[i].decimals));
            totalScore += normalized;
        }

        return ReputationSummary({
            feedbackCount: count,
            aggregatedScore: totalScore / count,
            decimals: maxDecimals
        });
    }

    function getFeedback(uint256 agentId, uint256 index) external view returns (Feedback memory) {
        return _feedbacks[agentId][index];
    }

    function getFeedbackCount(uint256 agentId) external view returns (uint256) {
        return _feedbacks[agentId].length;
    }
}
