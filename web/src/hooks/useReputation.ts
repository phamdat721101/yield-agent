"use client";

import { useReadContract } from "wagmi";
import {
  REPUTATION_REGISTRY_ADDRESS,
  REPUTATION_REGISTRY_ABI,
} from "@/lib/contracts";

export function useReputation(agentId: number) {
  const { data, isLoading, refetch } = useReadContract({
    address: REPUTATION_REGISTRY_ADDRESS,
    abi: REPUTATION_REGISTRY_ABI,
    functionName: "getSummary",
    args: [BigInt(agentId)],
    query: { enabled: agentId > 0 },
  });

  const feedbackCount = data ? Number(data[0]) : 0;
  const aggregatedScore = data ? Number(data[1]) : 0;
  const decimals = data ? Number(data[2]) : 0;
  const displayScore =
    decimals > 0 ? aggregatedScore / 10 ** decimals : aggregatedScore;

  return {
    feedbackCount,
    aggregatedScore,
    displayScore,
    decimals,
    isLoading,
    refetch,
  };
}
