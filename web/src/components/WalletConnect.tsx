"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";

export function WalletConnect() {
  const { login, logout, authenticated } = usePrivy();
  const { address } = useAccount();

  if (authenticated) {
    return (
      <div className="flex items-center gap-2">
        {address && (
          <span className="text-xs text-zinc-400">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        )}
        <button
          onClick={logout}
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
