"use client";

/**
 * StrategyArtifact — Interactive yield strategy card rendered inside chat.
 *
 * Features:
 *   - SVG semicircle risk gauge (Green / Yellow / Red)
 *   - Yield breakdown (protocol, APY, base vs reward, TVL)
 *   - "Deploy Strategy" action button
 */

interface StrategyData {
    protocol: string;
    pool: string;
    apyRange: string;
    riskTier: "green" | "yellow" | "red";
    riskScore: number; // 0–100
    tvl?: string;
    breakdown?: { base: string; rewards: string };
    contractAddress?: string;
}

function RiskGauge({ score, tier }: { score: number; tier: string }) {
    const clamp = Math.max(0, Math.min(100, score));
    // SVG arc: 180° semicircle, needle rotates from -90° to +90°
    const angle = -90 + (clamp / 100) * 180;
    const color = tier === "green" ? "#22c55e" : tier === "yellow" ? "#eab308" : "#ef4444";
    const label = tier === "green" ? "LOW RISK" : tier === "yellow" ? "MEDIUM" : "HIGH RISK";

    return (
        <div className="flex flex-col items-center">
            <svg width="120" height="70" viewBox="0 0 120 70">
                {/* Background arc */}
                <path d="M 10 65 A 50 50 0 0 1 110 65" fill="none" stroke="#3f3f46" strokeWidth="8" strokeLinecap="round" />
                {/* Green zone 0-30% */}
                <path d="M 10 65 A 50 50 0 0 1 28.4 22.7" fill="none" stroke="#22c55e" strokeWidth="8" strokeLinecap="round" opacity="0.3" />
                {/* Yellow zone 30-60% */}
                <path d="M 28.4 22.7 A 50 50 0 0 1 78.7 16.3" fill="none" stroke="#eab308" strokeWidth="8" strokeLinecap="round" opacity="0.3" />
                {/* Red zone 60-100% */}
                <path d="M 78.7 16.3 A 50 50 0 0 1 110 65" fill="none" stroke="#ef4444" strokeWidth="8" strokeLinecap="round" opacity="0.3" />
                {/* Needle */}
                <line
                    x1="60" y1="65" x2="60" y2="25"
                    stroke={color} strokeWidth="2.5" strokeLinecap="round"
                    transform={`rotate(${angle} 60 65)`}
                />
                <circle cx="60" cy="65" r="4" fill={color} />
            </svg>
            <div className="mt-1 text-[10px] font-bold tracking-widest" style={{ color }}>
                {label} ({clamp})
            </div>
        </div>
    );
}

export function StrategyArtifact({ strategy }: { strategy: StrategyData }) {
    return (
        <div className="mt-3 rounded-xl border border-zinc-700 bg-zinc-900/80 p-4">
            {/* Header */}
            <div className="mb-3 flex items-start justify-between">
                <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                        Strategy Proposal
                    </div>
                    <div className="text-sm font-semibold text-white">{strategy.protocol}</div>
                    <div className="text-xs text-zinc-400">{strategy.pool}</div>
                </div>
                <RiskGauge score={strategy.riskScore} tier={strategy.riskTier} />
            </div>

            {/* Yield breakdown */}
            <div className="grid grid-cols-3 gap-2 rounded-lg bg-zinc-800/60 p-3 text-center">
                <div>
                    <div className="text-[10px] text-zinc-500">APY Range</div>
                    <div className="text-sm font-bold text-emerald-400">{strategy.apyRange}</div>
                </div>
                {strategy.breakdown && (
                    <>
                        <div>
                            <div className="text-[10px] text-zinc-500">Base (Organic)</div>
                            <div className="text-sm font-semibold text-white">{strategy.breakdown.base}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-zinc-500">Rewards</div>
                            <div className="text-sm font-semibold text-yellow-400">{strategy.breakdown.rewards}</div>
                        </div>
                    </>
                )}
                {strategy.tvl && !strategy.breakdown && (
                    <div className="col-span-2">
                        <div className="text-[10px] text-zinc-500">TVL</div>
                        <div className="text-sm font-semibold text-white">{strategy.tvl}</div>
                    </div>
                )}
            </div>

            {strategy.tvl && strategy.breakdown && (
                <div className="mt-2 text-center text-[10px] text-zinc-500">
                    TVL: {strategy.tvl}
                </div>
            )}
        </div>
    );
}
