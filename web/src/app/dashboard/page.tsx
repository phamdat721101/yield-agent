"use client";

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
  DashboardYield,
  DashboardInsight,
  DashboardOpportunity,
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

// ── APY Table ──
function ApyTable({ yields }: { yields: DashboardYield[] }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">
        Top Yield Opportunities
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs text-zinc-400">
              <th className="pb-2 pr-4">Protocol</th>
              <th className="pb-2 pr-4">Pool</th>
              <th className="pb-2 pr-4 text-right">APY</th>
              <th className="pb-2 text-right">TVL</th>
            </tr>
          </thead>
          <tbody>
            {yields.map((y, i) => (
              <tr
                key={i}
                className="border-b border-zinc-800/50 last:border-0"
              >
                <td className="py-2.5 pr-4 font-medium text-white">
                  {y.project}
                </td>
                <td className="py-2.5 pr-4 text-zinc-300">{y.symbol}</td>
                <td className="py-2.5 pr-4 text-right font-mono text-emerald-400">
                  {y.apy != null ? `${y.apy.toFixed(2)}%` : "N/A"}
                </td>
                <td className="py-2.5 text-right text-zinc-400">
                  {formatTvl(y.tvlUsd)}
                </td>
              </tr>
            ))}
            {yields.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-zinc-500">
                  No yield data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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

// ── Risk Badge ──
function RiskBadge({ score }: { score: number }) {
  let color = "bg-emerald-500/20 text-emerald-400";
  let label = "Low";
  if (score >= 50) {
    color = "bg-red-500/20 text-red-400";
    label = "High";
  } else if (score >= 25) {
    color = "bg-amber-500/20 text-amber-400";
    label = "Med";
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${color}`}>
      {label} ({score})
    </span>
  );
}

// ── Opportunities Table ──
function OpportunitiesTable({ opportunities }: { opportunities: DashboardOpportunity[] }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">
        Scored Opportunities
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs text-zinc-400">
              <th className="pb-2 pr-3">#</th>
              <th className="pb-2 pr-4">Protocol</th>
              <th className="pb-2 pr-4">Pool</th>
              <th className="pb-2 pr-4">Category</th>
              <th className="pb-2 pr-4 text-right">APY</th>
              <th className="pb-2 pr-4 text-right">TVL</th>
              <th className="pb-2 pr-4 text-right">Score</th>
              <th className="pb-2 text-right">Risk</th>
            </tr>
          </thead>
          <tbody>
            {opportunities.map((o, i) => (
              <tr
                key={i}
                className="border-b border-zinc-800/50 last:border-0"
              >
                <td className="py-2.5 pr-3 text-zinc-500">{o.rank}</td>
                <td className="py-2.5 pr-4 font-medium text-white capitalize">
                  {o.protocol}
                </td>
                <td className="py-2.5 pr-4 text-zinc-300">{o.pool_name}</td>
                <td className="py-2.5 pr-4 text-zinc-400 capitalize">{o.category}</td>
                <td className="py-2.5 pr-4 text-right font-mono text-emerald-400">
                  {o.apy_total != null ? `${o.apy_total.toFixed(2)}%` : "N/A"}
                </td>
                <td className="py-2.5 pr-4 text-right text-zinc-400">
                  {formatTvl(o.tvl_usd)}
                </td>
                <td className="py-2.5 pr-4 text-right font-mono text-blue-400">
                  {o.opp_score.toFixed(1)}
                </td>
                <td className="py-2.5 text-right">
                  <RiskBadge score={o.risk_score} />
                </td>
              </tr>
            ))}
            {opportunities.length === 0 && (
              <tr>
                <td colSpan={8} className="py-4 text-center text-zinc-500">
                  No scored opportunities yet. Crawler runs every 6 hours.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Page ──
export default function DashboardPage() {
  const { data, isLoading, error } = useDashboard();

  const totalTvl = data?.protocols.reduce((sum, p) => sum + p.tvl, 0) ?? 0;
  const topApy = data?.yields.reduce(
    (max, y) => Math.max(max, y.apy ?? 0),
    0
  ) ?? 0;
  const topOpp = data?.opportunities?.[0];

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-bold text-white">
            L
          </div>
          <span className="text-sm font-semibold text-white">
            LionHeart Dashboard
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
            {/* Stat Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard
                label="Total TVL"
                value={formatTvl(totalTvl)}
                sub={`${data.protocols.length} protocols`}
              />
              <StatCard
                label="Best APY"
                value={topApy > 0 ? `${topApy.toFixed(1)}%` : "N/A"}
                sub={`${data.yields.length} pools tracked`}
              />
              <StatCard
                label="AI Insights"
                value={String(data.insights.length)}
                sub="generated reports"
              />
              <StatCard
                label="Top Opportunity"
                value={topOpp ? `${topOpp.opp_score.toFixed(0)}/100` : "N/A"}
                sub={topOpp ? `${topOpp.protocol} — ${topOpp.pool_name}` : "No scored pools yet"}
              />
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-2">
              <TvlChart protocols={data.protocols} />
              <ApyTable yields={data.yields} />
            </div>

            {/* Scored Opportunities */}
            <OpportunitiesTable opportunities={data.opportunities ?? []} />

            {/* Insights */}
            <InsightsPanel insights={data.insights} />
          </div>
        )}
      </main>
    </div>
  );
}
