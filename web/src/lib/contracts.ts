import { type Address } from "viem";

export const IDENTITY_REGISTRY_ADDRESS = (process.env
  .NEXT_PUBLIC_IDENTITY_REGISTRY || "0x0000000000000000000000000000000000000000") as Address;

export const REPUTATION_REGISTRY_ADDRESS = (process.env
  .NEXT_PUBLIC_REPUTATION_REGISTRY || "0x0000000000000000000000000000000000000000") as Address;

export const IDENTITY_REGISTRY_ABI = [
  {
    inputs: [{ name: "agentURI", type: "string" }],
    name: "register",
    outputs: [{ name: "agentId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "agentId", type: "uint256" }],
    name: "getAgentURI",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "agentId", type: "uint256" }],
    name: "getAgentWallet",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalAgents",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const REPUTATION_REGISTRY_ABI = [
  {
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "value", type: "uint256" },
      { name: "decimals", type: "uint8" },
      { name: "tag1", type: "bytes32" },
      { name: "tag2", type: "bytes32" },
      { name: "endpointURI", type: "string" },
      { name: "payloadHash", type: "bytes32" },
    ],
    name: "giveFeedback",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "agentId", type: "uint256" }],
    name: "getSummary",
    outputs: [
      { name: "feedbackCount", type: "uint256" },
      { name: "aggregatedScore", type: "uint256" },
      { name: "decimals", type: "uint8" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "agentId", type: "uint256" }],
    name: "getFeedbackCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
