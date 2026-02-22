"use client";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/hooks/useWallet";

const STYLE_EMOJI: Record<string, string> = {
  yield_sentry: "🛡️",
  defi_researcher: "🔬",
  btcfi_hunter: "₿",
  stable_guardian: "🏦",
};
const LEVEL_COLOR: Record<string, string> = {
  newbie: "text-green-400",
  intermediate: "text-blue-400",
  advanced: "text-purple-400",
};

export function AgentStatusCard({ walletAddress }: { walletAddress: string }) {
  const { hasNFT } = useWallet();
  const { data } = useQuery({
    queryKey: ["agentProfile", walletAddress],
    queryFn: () => fetch(`/api/profile?wallet=${walletAddress}`).then((r) => r.json()),
    enabled: !!walletAddress,
    staleTime: 60_000,
    retry: 1,
  });

  if (!data?.profile) return null;

  const { profile, messageCount } = data;
  const emoji = STYLE_EMOJI[profile.agent_style] || "🤖";
  const levelClass = LEVEL_COLOR[profile.user_level] || "text-zinc-300";
  const nftLabel = hasNFT ? `NFT #${profile.agent_token_id ?? "?"}` : "No NFT";
  const nftColor = hasNFT ? "text-emerald-400" : "text-zinc-500";

  return (
    <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/50 px-2.5 py-1.5 text-xs">
      <span>{emoji}</span>
      <span className={`font-medium ${levelClass} capitalize`}>
        {profile.agent_style.replace(/_/g, " ")}
      </span>
      <span className="text-zinc-600">·</span>
      <span className="text-zinc-500">{messageCount} msgs</span>
      <span className={`ml-1 text-[10px] font-semibold ${nftColor}`}>{nftLabel}</span>
    </div>
  );
}
