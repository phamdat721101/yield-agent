"use client";

import { useAccount, useReadContract } from "wagmi";
import {
  IDENTITY_REGISTRY_ADDRESS,
  IDENTITY_REGISTRY_ABI,
} from "@/lib/contracts";

export function useWallet() {
  const { address, isConnected, chain } = useAccount();

  const { data: nftBalance } = useReadContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const hasNFT = nftBalance !== undefined && nftBalance > 0n;

  return {
    address,
    isConnected,
    chain,
    hasNFT,
    nftBalance: nftBalance ? Number(nftBalance) : 0,
  };
}
