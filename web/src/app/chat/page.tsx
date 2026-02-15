"use client";

import { ChatWindow } from "@/components/ChatWindow";
import { WalletConnect } from "@/components/WalletConnect";
import { useWallet } from "@/hooks/useWallet";

export default function ChatPage() {
  const { address, isConnected } = useWallet();

  return (
    <div className="flex h-screen flex-col bg-zinc-950">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-bold text-white">
            L
          </div>
          <span className="text-sm font-semibold text-white">LionHeart</span>
        </div>
        <WalletConnect />
      </header>

      {/* Chat area — always show chat, wallet is optional for testing */}
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden">
        <ChatWindow walletAddress={address} />
      </main>

      {/* Wallet hint if not connected */}
      {!isConnected && (
        <div className="border-t border-zinc-800 bg-zinc-900/50 px-4 py-2 text-center text-xs text-zinc-500">
          Connect wallet for on-chain features (NFT minting, reputation, feedback)
        </div>
      )}
    </div>
  );
}
