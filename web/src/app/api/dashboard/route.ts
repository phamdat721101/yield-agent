import { NextResponse } from "next/server";
import { Pool } from "pg";

/**
 * Dashboard API — serves protocol stats, yields, and AI insights.
 * Reads directly from Supabase via pg (same pattern as agent).
 */

let pool: Pool | null = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function GET() {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    // Return mock data when DB is not configured
    return NextResponse.json({
      protocols: [
        { name: "GMX", tvl: 543000000, change_1d: 2.1, category: "Derivatives" },
        { name: "Aave V3", tvl: 412000000, change_1d: -0.5, category: "Lending" },
        { name: "Uniswap V3", tvl: 321000000, change_1d: 1.3, category: "DEX" },
        { name: "Pendle", tvl: 289000000, change_1d: 5.2, category: "Yield" },
        { name: "Radiant", tvl: 178000000, change_1d: -1.8, category: "Lending" },
      ],
      yields: [
        { project: "Pendle", symbol: "USDC", apy: 12.5, tvlUsd: 45000000 },
        { project: "Aave V3", symbol: "USDC", apy: 8.2, tvlUsd: 120000000 },
        { project: "GMX", symbol: "GLP", apy: 15.3, tvlUsd: 200000000 },
      ],
      insights: [
        {
          title: "6-Hour Market Update",
          content: "Arbitrum TVL continues steady growth. GMX leads with $543M TVL.",
          created_at: new Date().toISOString(),
        },
      ],
      opportunities: [
        { rank: 1, protocol: "pendle", pool_name: "USDC-27MAR", category: "yield", tokens: ["USDC"], apy_total: 12.5, tvl_usd: 45000000, opp_score: 72.3, risk_score: 15 },
        { rank: 2, protocol: "aave-v3", pool_name: "USDC Supply", category: "lending", tokens: ["USDC"], apy_total: 8.2, tvl_usd: 120000000, opp_score: 65.1, risk_score: 5 },
        { rank: 3, protocol: "gmx", pool_name: "GM BTC-USDC", category: "derivatives", tokens: ["BTC", "USDC"], apy_total: 15.3, tvl_usd: 200000000, opp_score: 60.8, risk_score: 20 },
      ],
      lastUpdated: new Date().toISOString(),
      source: "mock",
    });
  }

  try {
    const db = getPool();

    // Fetch latest arbitrum_stats
    const statsResult = await db.query(
      "SELECT * FROM arbitrum_stats ORDER BY created_at DESC LIMIT 1"
    );
    const stats = statsResult.rows[0];

    // Fetch latest insights
    const insightsResult = await db.query(
      "SELECT title, content, created_at FROM insights ORDER BY created_at DESC LIMIT 5"
    );

    // Fetch top scored opportunities
    let opportunities: any[] = [];
    try {
      const oppResult = await db.query(
        `SELECT protocol, pool_name, category, tokens, apy_total, tvl_usd, opp_score, risk_score
         FROM pool_snapshots
         WHERE fetched_at > NOW() - INTERVAL '12 hours'
         ORDER BY opp_score DESC NULLS LAST
         LIMIT 10`
      );
      opportunities = oppResult.rows.map((r: any, i: number) => ({
        rank: i + 1,
        protocol: r.protocol,
        pool_name: r.pool_name,
        category: r.category,
        tokens: r.tokens,
        apy_total: r.apy_total != null ? Number(r.apy_total) : null,
        tvl_usd: Number(r.tvl_usd),
        opp_score: Number(r.opp_score),
        risk_score: Number(r.risk_score),
      }));
    } catch {
      // pool_snapshots table may not exist yet
    }

    return NextResponse.json({
      protocols: stats?.protocols || [],
      yields: stats?.yields || [],
      insights: insightsResult.rows,
      opportunities,
      lastUpdated: stats?.created_at || null,
      source: "database",
    });
  } catch (err: any) {
    console.error("[dashboard] DB error:", err.message);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data", details: err.message },
      { status: 500 }
    );
  }
}
