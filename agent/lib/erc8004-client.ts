/**
 * ERC-8004 contract client — viem-based read/write helpers
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hex,
  parseAbi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";

const IDENTITY_ABI = parseAbi([
  "function register(string agentURI) external returns (uint256)",
  "function setMetadata(uint256 agentId, string newURI) external",
  "function setAgentWallet(uint256 agentId, address wallet) external",
  "function getAgentURI(uint256 agentId) external view returns (string)",
  "function getAgentWallet(uint256 agentId) external view returns (address)",
  "function totalAgents() external view returns (uint256)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
]);

const REPUTATION_ABI = parseAbi([
  "function giveFeedback(uint256 agentId, uint256 value, uint8 decimals, bytes32 tag1, bytes32 tag2, string endpointURI, bytes32 payloadHash) external",
  "function getSummary(uint256 agentId) external view returns (uint256 feedbackCount, uint256 aggregatedScore, uint8 decimals)",
  "function getFeedbackCount(uint256 agentId) external view returns (uint256)",
]);

export function getPublicClient(rpcUrl?: string) {
  return createPublicClient({
    chain: arbitrumSepolia,
    transport: http(rpcUrl || process.env.ARBITRUM_SEPOLIA_RPC),
  });
}

export function getWalletClient(privateKey: Hex, rpcUrl?: string) {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain: arbitrumSepolia,
    transport: http(rpcUrl || process.env.ARBITRUM_SEPOLIA_RPC),
  });
}

// --- Identity Registry ---

export async function getAgentURI(identityAddress: Address, agentId: bigint, rpcUrl?: string) {
  const client = getPublicClient(rpcUrl);
  return client.readContract({
    address: identityAddress,
    abi: IDENTITY_ABI,
    functionName: "getAgentURI",
    args: [agentId],
  });
}

export async function getAgentWallet(identityAddress: Address, agentId: bigint, rpcUrl?: string) {
  const client = getPublicClient(rpcUrl);
  return client.readContract({
    address: identityAddress,
    abi: IDENTITY_ABI,
    functionName: "getAgentWallet",
    args: [agentId],
  });
}

export async function totalAgents(identityAddress: Address, rpcUrl?: string) {
  const client = getPublicClient(rpcUrl);
  return client.readContract({
    address: identityAddress,
    abi: IDENTITY_ABI,
    functionName: "totalAgents",
  });
}

export async function registerAgent(
  identityAddress: Address,
  agentURI: string,
  privateKey: Hex,
  rpcUrl?: string
) {
  const wallet = getWalletClient(privateKey, rpcUrl);
  return wallet.writeContract({
    address: identityAddress,
    abi: IDENTITY_ABI,
    functionName: "register",
    args: [agentURI],
  });
}

// --- Reputation Registry ---

export async function getReputationSummary(
  reputationAddress: Address,
  agentId: bigint,
  rpcUrl?: string
) {
  const client = getPublicClient(rpcUrl);
  const result = await client.readContract({
    address: reputationAddress,
    abi: REPUTATION_ABI,
    functionName: "getSummary",
    args: [agentId],
  });
  return {
    feedbackCount: result[0],
    aggregatedScore: result[1],
    decimals: result[2],
  };
}

export async function giveFeedback(
  reputationAddress: Address,
  agentId: bigint,
  value: bigint,
  decimals: number,
  tag1: Hex,
  tag2: Hex,
  endpointURI: string,
  payloadHash: Hex,
  privateKey: Hex,
  rpcUrl?: string
) {
  const wallet = getWalletClient(privateKey, rpcUrl);
  return wallet.writeContract({
    address: reputationAddress,
    abi: REPUTATION_ABI,
    functionName: "giveFeedback",
    args: [agentId, value, decimals, tag1, tag2, endpointURI, payloadHash],
  });
}
