"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useDisconnect } from "wagmi";

export function WalletConnect() {
  const { login, logout, authenticated } = usePrivy();
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const [copied, setCopied] = useState(false);

  const handleLogout = () => {
    disconnect();
    logout();
  };

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (authenticated) {
    return (
      <div className="flex items-center gap-2">
        {address && (
          <button
            onClick={copyAddress}
            className="flex items-center gap-1 text-xs text-zinc-400 transition-colors hover:text-zinc-200"
            title={copied ? "Copied!" : address}
          >
            <span>{address.slice(0, 6)}...{address.slice(-4)}</span>
            <span className="text-[10px]">{copied ? "✓" : "⎘"}</span>
          </button>
        )}
        <button
          onClick={handleLogout}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-red-500 hover:text-red-400"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
    >
      Sign in
    </button>
  );
}
