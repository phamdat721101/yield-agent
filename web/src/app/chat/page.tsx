"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChatWindow } from "@/components/ChatWindow";
import { WalletConnect } from "@/components/WalletConnect";
import { useWallet } from "@/hooks/useWallet";
import { usePrivy } from "@privy-io/react-auth";
import { AgentStatusCard } from "@/components/AgentStatusCard";
import type { UserProfile } from "@/components/OnboardingFlow";

export default function ChatPage() {
  const router = useRouter();
  const { address, isConnected } = useWallet();
  const { authenticated } = usePrivy();
  const prevAuth = useRef(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Redirect to home when user logs out
  useEffect(() => {
    if (prevAuth.current && !authenticated) {
      localStorage.removeItem("userProfile");
      localStorage.removeItem("chat_history");
      router.push("/");
    }
    prevAuth.current = authenticated;
  }, [authenticated, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("userProfile");
    if (stored) {
      try {
        setUserProfile(JSON.parse(stored));
      } catch {
        // Ignore malformed data
      }
    }
  }, []);

  return (
    <div className="flex h-screen flex-col bg-zinc-950">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-bold text-white">
            L
          </div>
          <span className="text-sm font-semibold text-white">LionHeart</span>
          {address && <AgentStatusCard walletAddress={address} />}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-blue-500 hover:text-white"
          >
            Profile
          </Link>
          <Link
            href="/dashboards"
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-blue-500 hover:text-white"
          >
            My Dashboards
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-blue-500 hover:text-white"
          >
            Dashboard
          </Link>
          <WalletConnect />
        </div>
      </header>

      {/* Chat area — always show chat, wallet is optional for testing */}
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden">
        <ChatWindow walletAddress={address} userProfile={userProfile} />
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
