"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";
import { useReputation } from "@/hooks/useReputation";

const STYLE_META: Record<string, { emoji: string; name: string }> = {
  yield_sentry:    { emoji: "🦁", name: "Yield Sentry" },
  defi_researcher: { emoji: "🔬", name: "DeFi Researcher" },
  btcfi_hunter:    { emoji: "₿",  name: "BTCFi Hunter" },
  stable_guardian: { emoji: "🛡️", name: "Stable Guardian" },
};

const LEVEL_COLORS: Record<string, string> = {
  newbie:       "bg-zinc-700 text-zinc-300",
  intermediate: "bg-blue-900 text-blue-300",
  advanced:     "bg-purple-900 text-purple-300",
  master:       "bg-amber-900 text-amber-300",
};

export default function ProfilePage() {
  const router = useRouter();
  const { authenticated } = usePrivy();
  const { address } = useAccount();
  const [copied, setCopied] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!authenticated) router.push("/");
  }, [authenticated, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["profile", address],
    queryFn: () =>
      fetch(`/api/profile?wallet=${address}`).then((r) => r.json()),
    enabled: !!address,
    staleTime: 30_000,
  });

  const profile = data?.profile ?? null;
  const messageCount: number = data?.messageCount ?? 0;
  const recentActivity: any[] = data?.recentActivity ?? [];

  const tokenId: number = profile?.agent_token_id ?? 0;
  const reputation = useReputation(tokenId);

  const style = STYLE_META[profile?.agent_style] ?? { emoji: "🤖", name: profile?.agent_style ?? "Unknown" };
  const levelClass = LEVEL_COLORS[profile?.user_level] ?? LEVEL_COLORS.newbie;
  const score = reputation.displayScore;
  const scoreColor = score >= 100 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400";

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!authenticated) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <Link
          href="/chat"
          className="flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
        >
          <span>←</span>
          <span>Back</span>
        </Link>
        <h1 className="text-sm font-semibold">Agent Profile</h1>
        <div className="w-16" />
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        {isLoading ? (
          <div className="text-center text-sm text-zinc-500 py-10">Loading profile…</div>
        ) : (
          <>
            {/* Agent Card */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{style.emoji}</span>
                  <div>
                    <div className="font-semibold">{style.name}</div>
                    {profile?.agent_name && (
                      <div className="text-xs text-zinc-500">{profile.agent_name}</div>
                    )}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${levelClass}`}>
                  {profile?.user_level ?? "—"}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-zinc-500">Wallet:</span>
                {address ? (
                  <button
                    onClick={copyAddress}
                    className="flex items-center gap-1 text-xs text-zinc-400 transition-colors hover:text-zinc-200"
                    title={copied ? "Copied!" : address}
                  >
                    <span>{address.slice(0, 6)}…{address.slice(-4)}</span>
                    <span className="text-[10px]">{copied ? "✓" : "⎘"}</span>
                  </button>
                ) : (
                  <span className="text-xs text-zinc-600">—</span>
                )}
              </div>

              <div className="mt-2 flex items-center gap-2">
                {tokenId > 0 ? (
                  <span className="rounded-md bg-emerald-900/50 px-2 py-0.5 text-xs text-emerald-400">
                    NFT #{tokenId}
                  </span>
                ) : (
                  <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
                    No NFT
                  </span>
                )}
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-center">
                <div className="text-xl font-bold">{messageCount}</div>
                <div className="mt-0.5 text-xs text-zinc-500">Messages</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-center">
                <div className={`text-xl font-bold ${scoreColor}`}>
                  {reputation.isLoading ? "…" : score.toFixed(0)}
                </div>
                <div className="mt-0.5 text-xs text-zinc-500">Reputation</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-center">
                <div className="text-xl font-bold">{recentActivity.length}</div>
                <div className="mt-0.5 text-xs text-zinc-500">Activities</div>
              </div>
            </div>

            {/* Reputation Details */}
            {tokenId > 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  On-Chain Reputation
                </h2>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-bold ${scoreColor}`}>
                    {reputation.isLoading ? "…" : score.toFixed(1)}
                  </span>
                  <span className="text-xs text-zinc-500">
                    / {reputation.feedbackCount} {reputation.feedbackCount === 1 ? "entry" : "entries"}
                  </span>
                </div>
                {score >= 100 ? (
                  <p className="mt-1 text-xs text-emerald-400">Trading unlocked ✓</p>
                ) : (
                  <p className="mt-1 text-xs text-zinc-500">
                    Need {Math.max(0, 100 - score).toFixed(0)} more points to unlock trading
                  </p>
                )}
              </div>
            )}

            {/* Agent Settings */}
            {profile && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Agent Settings
                </h2>
                <div className="space-y-2.5 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="w-24 shrink-0 text-xs text-zinc-500">Protocols</span>
                    <div className="flex flex-wrap gap-1">
                      {(profile.whitelisted_protocols ?? []).map((p: string) => (
                        <span
                          key={p}
                          className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-24 shrink-0 text-xs text-zinc-500">Min APY</span>
                    <span className="text-xs text-zinc-300">{profile.min_apy_threshold ?? "—"}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-24 shrink-0 text-xs text-zinc-500">Risk level</span>
                    <span className="text-xs capitalize text-zinc-300">{profile.user_level ?? "—"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Activity */}
            {recentActivity.length > 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Recent Activity
                </h2>
                <div className="space-y-2">
                  {recentActivity.map((a: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-300">{a.protocol}</span>
                        <span className="text-zinc-500 capitalize">{a.action}</span>
                      </div>
                      <div className="flex items-center gap-3 text-zinc-400">
                        {a.amount_usd && (
                          <span>${Number(a.amount_usd).toLocaleString()}</span>
                        )}
                        {a.apy_at_entry && (
                          <span className="text-emerald-400">{Number(a.apy_at_entry).toFixed(1)}%</span>
                        )}
                        {a.recorded_at && (
                          <span className="text-zinc-600">
                            {new Date(a.recorded_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!profile && !isLoading && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center text-sm text-zinc-500">
                No profile found.{" "}
                <Link href="/" className="text-blue-400 hover:underline">
                  Complete onboarding
                </Link>{" "}
                to set up your agent.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
