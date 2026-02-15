// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IReputationRegistry {
    struct Feedback {
        address reviewer;
        uint256 agentId;
        uint256 value;
        uint8 decimals;
        bytes32 tag1;
        bytes32 tag2;
        string endpointURI;
        bytes32 payloadHash;
        uint256 timestamp;
    }

    struct ReputationSummary {
        uint256 feedbackCount;
        uint256 aggregatedScore;
        uint8 decimals;
    }

    event FeedbackGiven(
        uint256 indexed agentId,
        address indexed reviewer,
        uint256 value,
        bytes32 tag1,
        bytes32 tag2
    );

    function giveFeedback(
        uint256 agentId,
        uint256 value,
        uint8 decimals,
        bytes32 tag1,
        bytes32 tag2,
        string calldata endpointURI,
        bytes32 payloadHash
    ) external;

    function getSummary(uint256 agentId) external view returns (ReputationSummary memory);
    function getFeedback(uint256 agentId, uint256 index) external view returns (Feedback memory);
    function getFeedbackCount(uint256 agentId) external view returns (uint256);
}
