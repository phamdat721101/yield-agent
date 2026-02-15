"use client";

import { useReputation } from "@/hooks/useReputation";

export function TrustBadge({ agentId }: { agentId: number }) {
  const { displayScore, feedbackCount, isLoading } = useReputation(agentId);

  if (isLoading) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
        Loading...
      </div>
    );
  }

  const level =
    displayScore >= 100
      ? { label: "Trusted", color: "bg-emerald-900 text-emerald-300 border-emerald-700" }
      : displayScore >= 50
        ? { label: "Building Trust", color: "bg-amber-900 text-amber-300 border-amber-700" }
        : { label: "New Agent", color: "bg-zinc-800 text-zinc-300 border-zinc-600" };

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${level.color}`}
    >
      <span className="inline-block h-2 w-2 rounded-full bg-current" />
      <span>{level.label}</span>
      <span className="text-[10px] opacity-70">
        Score: {displayScore} ({feedbackCount} reviews)
      </span>
    </div>
  );
}
