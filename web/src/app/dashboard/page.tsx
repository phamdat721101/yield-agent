"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useDashboard } from "@/hooks/useDashboard";
import type {
  DashboardProtocol,
  DashboardInsight,
  DashboardOpportunity,
  DashboardNarration,
  PortfolioPnL,
} from "@/hooks/useDashboard";

const COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#6366f1",
  "#14b8a6",
  "#f97316",
];

function formatTvl(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value}`;
}

// ── Stat Card ──
function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

// ── Market Strip ──
function MarketStrip({ narration }: { narration: DashboardNarration | null }) {
  return (
    <div className="rounded-xl border border-zinc-700 bg-gradient-to-r from-blue-950/50 via-purple-950/30 to-zinc-900 p-5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-400">
        What&apos;s Happening
      </p>
      {narration ? (
        <>
          <p className="text-sm leading-relaxed text-zinc-200">
            {narration.content}
          </p>
          <p className="mt-2 text-[10px] text-zinc-500">
            {new Date(narration.created_at).toLocaleString()}
          </p>
        </>
      ) : (
        <p className="text-sm text-zinc-500">
          Market narration will appear after the first crawler run.
        </p>
      )}
    </div>
  );
}

// ── Risk Badge ──
function RiskBadge({ level }: { level: 'green' | 'yellow' | 'red' }) {
  const styles = {
    green: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    yellow: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    red: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  const labels = { green: "Low Risk", yellow: "Medium", red: "High Risk" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${styles[level]}`}>
      {labels[level]}
    </span>
  );
}

// ── Safe Yield Playlist ──
type RiskTab = 'green' | 'yellow' | 'red';

function SafeYieldPlaylist({ opportunities }: { opportunities: DashboardOpportunity[] }) {
  const [activeTab, setActiveTab] = useState<RiskTab>('green');

  const tabs: { key: RiskTab; label: string }[] = [
    { key: 'green', label: 'Stablecoins (Low Risk)' },
    { key: 'yellow', label: 'Blue Chips (Medium)' },
    { key: 'red', label: 'Degen (High)' },
  ];

  const filtered = opportunities.filter(o => o.risk_level === activeTab);

  const borderColor = {
    green: "border-emerald-500/40",
    yellow: "border-amber-500/40",
    red: "border-red-500/40",
  };

  const bgColor = {
    green: "bg-emerald-500/5",
    yellow: "bg-amber-500/5",
    red: "bg-red-500/5",
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">Safe Yield Playlist</h3>

      {/* Tab Bar */}
      <div className="mb-4 flex gap-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-zinc-700 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Card Grid */}
      {filtered.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((o, i) => (
            <div
              key={i}
              className={`rounded-lg border ${borderColor[activeTab]} ${bgColor[activeTab]} p-3`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium capitalize text-white">{o.protocol}</p>
                  <p className="text-[11px] text-zinc-400">{o.pool_name}</p>
                </div>
                <RiskBadge level={o.risk_level} />
              </div>
              <p className="mt-2 text-2xl font-bold font-mono text-emerald-400">
                {o.apy_total != null ? `${o.apy_total.toFixed(1)}%` : "N/A"}
              </p>
              <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-500">
                <span>TVL {formatTvl(o.tvl_usd)}</span>
                <span>Score {o.opp_score.toFixed(0)}/100</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-6 text-center text-xs text-zinc-500">
          No pools in this risk category yet.
        </p>
      )}
    </div>
  );
}

// ── Reality Report ──
function RealityReport({ pnl }: { pnl: PortfolioPnL | null }) {
  if (!pnl) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <p className="text-sm font-semibold text-zinc-400">Reality Report</p>
        <p className="mt-2 text-xs text-zinc-500">
          Connect wallet to see your Reality Report
        </p>
      </div>
    );
  }

  const pnlColor = pnl.netPnL >= 0 ? "text-emerald-400" : "text-red-400";
  const pnlSign = pnl.netPnL >= 0 ? "+" : "";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">Reality Report</h3>
      <p className={`text-3xl font-bold font-mono ${pnlColor}`}>
        {pnlSign}${Math.abs(pnl.netPnL).toFixed(2)}
      </p>
      <p className="mb-3 text-[10px] text-zinc-500">Net PnL</p>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-[10px] text-zinc-500">Deposited</p>
          <p className="text-sm font-medium text-white">${pnl.totalDeposited.toFixed(0)}</p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-500">Earned</p>
          <p className="text-sm font-medium text-emerald-400">+${pnl.estimatedEarnings.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-500">Eff. APY</p>
          <p className="text-sm font-medium text-blue-400">{pnl.effectiveApy.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}

// ── TVL Bar Chart ──
function TvlChart({ protocols }: { protocols: DashboardProtocol[] }) {
  const data = protocols.map((p) => ({
    name: p.name,
    tvl: p.tvl,
  }));

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="mb-4 text-sm font-semibold text-white">
        TVL by Protocol
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <XAxis
            dataKey="name"
            tick={{ fill: "#a1a1aa", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => formatTvl(v)}
            tick={{ fill: "#a1a1aa", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: "8px",
            }}
            labelStyle={{ color: "#fff" }}
            formatter={(value) => [formatTvl(value as number), "TVL"]}
          />
          <Bar dataKey="tvl" radius={[6, 6, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Insights Panel ──
function InsightsPanel({ insights }: { insights: DashboardInsight[] }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">AI Insights</h3>
      <div className="space-y-3">
        {insights.map((ins, i) => (
          <div key={i} className="border-b border-zinc-800/50 pb-3 last:border-0 last:pb-0">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-blue-400">{ins.title}</p>
              <p className="text-[10px] text-zinc-500">
                {new Date(ins.created_at).toLocaleString()}
              </p>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-zinc-300 line-clamp-3">
              {ins.content}
            </p>
          </div>
        ))}
        {insights.length === 0 && (
          <p className="text-xs text-zinc-500">No insights yet. The crawler generates them every 6 hours.</p>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──
export default function DashboardPage() {
  const { data, isLoading, error } = useDashboard();

  const poolsTracked = data?.opportunities?.length ?? 0;
  const bestSafeApy = data?.opportunities
    ?.filter(o => o.risk_level === 'green')
    .reduce((max, o) => Math.max(max, o.apy_total ?? 0), 0) ?? 0;

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-bold text-white">
            YS
          </div>
          <span className="text-sm font-semibold text-white">
            Yield Sentry
          </span>
        </div>
        <Link
          href="/chat"
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-blue-500 hover:text-white"
        >
          Back to Chat
        </Link>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-6 py-6">
        {isLoading && (
          <div className="flex h-64 items-center justify-center text-zinc-400">
            Loading dashboard data...
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-900 bg-red-950/50 p-4 text-sm text-red-300">
            Failed to load dashboard: {(error as Error).message}
          </div>
        )}

        {data && (
          <div className="space-y-6">
            {/* Market Strip */}
            <MarketStrip narration={data.narration} />

            {/* Stat Cards */}
            <div className="grid grid-cols-3 gap-4">
              <StatCard
                label="Pools Tracked"
                value={String(poolsTracked)}
                sub="across Arbitrum protocols"
              />
              <StatCard
                label="Best Safe APY"
                value={bestSafeApy > 0 ? `${bestSafeApy.toFixed(1)}%` : "N/A"}
                sub="Green-rated pools only"
              />
              <StatCard
                label="Last Scan"
                value={data.lastUpdated
                  ? new Date(data.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : "N/A"
                }
                sub="every 15 minutes"
              />
            </div>

            {/* Safe Yield Playlist */}
            <SafeYieldPlaylist opportunities={data.opportunities ?? []} />

            {/* Charts + Reality Report Row */}
            <div className="grid gap-6 lg:grid-cols-2">
              <TvlChart protocols={data.protocols} />
              <RealityReport pnl={data.portfolioPnL} />
            </div>

            {/* Insights */}
            <InsightsPanel insights={data.insights} />
          </div>
        )}
      </main>
    </div>
  );
}
