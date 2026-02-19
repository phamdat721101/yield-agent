"use client";

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useWallet } from "@/hooks/useWallet";
import { WalletConnect } from "./WalletConnect";
import {
  IDENTITY_REGISTRY_ADDRESS,
  IDENTITY_REGISTRY_ABI,
} from "@/lib/contracts";

const DEFAULT_AGENT_URI = "ipfs://QmLionHeartDefaultAgentCard";

export function OnboardingFlow({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const { isConnected, hasNFT, address } = useWallet();
  const {
    writeContract,
    data: txHash,
    isPending: isWriting,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash: txHash });

  // Auto-advance when NFT detected
  if (isConnected && hasNFT) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 text-3xl font-bold text-white">
            L
          </div>
          <h1 className="mb-2 text-2xl font-bold text-white">
            Welcome back!
          </h1>
          <p className="mb-6 text-sm text-zinc-400">
            Your agent identity NFT was found. Entering the chat...
          </p>
          <button
            onClick={onComplete}
            className="rounded-xl bg-blue-600 px-8 py-3 text-sm font-medium text-white hover:bg-blue-500"
          >
            Open Chat
          </button>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 text-3xl font-bold text-white">
            L
          </div>
          <h1 className="mb-2 text-2xl font-bold text-white">
            Agent Identity Created!
          </h1>
          <p className="mb-6 text-sm text-zinc-400">
            Your ERC-8004 agent NFT has been minted on Arbitrum Sepolia.
          </p>
          <button
            onClick={onComplete}
            className="rounded-xl bg-blue-600 px-8 py-3 text-sm font-medium text-white hover:bg-blue-500"
          >
            Start Chatting
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-3xl font-bold text-white">
          L
        </div>
        <h1 className="mb-2 text-2xl font-bold text-white">LionHeart</h1>
        <p className="mb-2 text-sm text-zinc-400">
          The Verifiable DeFi Mentor
        </p>
        <p className="mb-8 text-xs text-zinc-500">
          Connect your wallet and mint an agent identity NFT to start chatting
          with your AI DeFi advisor.
        </p>

        {!isConnected ? (
          <div className="flex justify-center">
            <WalletConnect />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-left text-sm">
              <p className="mb-1 text-zinc-400">Connected:</p>
              <p className="font-mono text-xs text-white">
                {address}
              </p>
            </div>

            {/* Primary Action: Start Chatting */}
            <button
              onClick={onComplete}
              className="w-full rounded-xl bg-blue-600 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-500 shadow-lg shadow-blue-900/20"
            >
              Start Chatting
            </button>

            {/* Optional: Mint Identity */}
            <div className="pt-2 border-t border-zinc-900">
              <p className="mb-2 text-xs text-zinc-500">Optional: Create on-chain agent identity</p>
              <button
                onClick={() =>
                  writeContract({
                    address: IDENTITY_REGISTRY_ADDRESS,
                    abi: IDENTITY_REGISTRY_ABI,
                    functionName: "register",
                    args: [DEFAULT_AGENT_URI],
                  })
                }
                disabled={isWriting || isConfirming}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-8 py-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-40"
              >
                {isWriting
                  ? "Confirm in wallet..."
                  : isConfirming
                    ? "Minting..."
                    : "Mint Agent Identity NFT"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
