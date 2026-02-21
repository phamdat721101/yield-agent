import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

/**
 * Dashboard API — serves protocol stats, yields, AI insights, narration, and PnL.
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

function classifyRisk(score: number): 'green' | 'yellow' | 'red' {
  if (score < 25) return 'green';
  if (score < 50) return 'yellow';
  return 'red';
}

export async function GET(request: NextRequest) {
  const dbUrl = process.env.DATABASE_URL;
  const wallet = request.nextUrl.searchParams.get("wallet");

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
        { rank: 1, protocol: "pendle", pool_name: "USDC-27MAR", category: "yield", tokens: ["USDC"], apy_total: 12.5, tvl_usd: 45000000, opp_score: 72.3, risk_score: 15, risk_level: "green" },
        { rank: 2, protocol: "aave-v3", pool_name: "USDC Supply", category: "lending", tokens: ["USDC"], apy_total: 8.2, tvl_usd: 120000000, opp_score: 65.1, risk_score: 5, risk_level: "green" },
        { rank: 3, protocol: "gmx", pool_name: "GM BTC-USDC", category: "derivatives", tokens: ["BTC", "USDC"], apy_total: 15.3, tvl_usd: 200000000, opp_score: 60.8, risk_score: 20, risk_level: "green" },
        { rank: 4, protocol: "camelot", pool_name: "USDC-USDT", category: "dex", tokens: ["USDC", "USDT"], apy_total: 22.1, tvl_usd: 8500000, opp_score: 55.4, risk_score: 30, risk_level: "yellow" },
        { rank: 5, protocol: "vela", pool_name: "VLP Vault", category: "derivatives", tokens: ["USDC"], apy_total: 45.0, tvl_usd: 2000000, opp_score: 42.0, risk_score: 55, risk_level: "red" },
      ],
      narration: {
        content: "Stablecoin yields on Arbitrum ticked up 0.3% across lending protocols as borrowing demand picked up following the ETH rally to $3,400. Aave V3 USDC supply hit 8.2% APY — the highest since October. If you have idle USDC, the Green-rated Aave V3 pool is the safest move right now at $120M TVL.",
        created_at: new Date().toISOString(),
      },
      portfolioPnL: null,
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

    // Fetch latest narration
    let narration = null;
    try {
      const narrationResult = await db.query(
        "SELECT content, created_at FROM narrations ORDER BY created_at DESC LIMIT 1"
      );
      narration = narrationResult.rows[0] || null;
    } catch { /* table may not exist yet */ }

    // Fetch top scored opportunities with risk_level
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
        risk_level: classifyRisk(Number(r.risk_score)),
      }));
    } catch {
      // pool_snapshots table may not exist yet
    }

    // Fetch portfolio PnL if wallet provided
    let portfolioPnL = null;
    if (wallet) {
      try {
        const pnlResult = await db.query(
          `SELECT action, amount_usd, apy_at_entry, recorded_at FROM portfolio_tracking WHERE wallet_address = $1 ORDER BY recorded_at`,
          [wallet]
        );
        const rows = pnlResult.rows;
        if (rows.length > 0) {
          let totalDeposited = 0;
          let totalWithdrawn = 0;
          let weightedApySum = 0;
          let weightedAmount = 0;
          let estimatedEarnings = 0;
          const now = Date.now();

          for (const r of rows) {
            const amt = Number(r.amount_usd);
            const apy = Number(r.apy_at_entry || 0);
            if (r.action === 'deposit') {
              totalDeposited += amt;
              const daysHeld = (now - new Date(r.recorded_at).getTime()) / (1000 * 60 * 60 * 24);
              estimatedEarnings += amt * (apy / 100) * (daysHeld / 365);
              weightedApySum += apy * amt;
              weightedAmount += amt;
            } else if (r.action === 'withdraw') {
              totalWithdrawn += amt;
            }
          }

          portfolioPnL = {
            totalDeposited: Math.round(totalDeposited * 100) / 100,
            totalWithdrawn: Math.round(totalWithdrawn * 100) / 100,
            estimatedEarnings: Math.round(estimatedEarnings * 100) / 100,
            netPnL: Math.round((totalWithdrawn + estimatedEarnings - totalDeposited) * 100) / 100,
            effectiveApy: weightedAmount > 0 ? Math.round((weightedApySum / weightedAmount) * 100) / 100 : 0,
          };
        }
      } catch { /* portfolio_tracking table may not exist yet */ }
    }

    return NextResponse.json({
      protocols: stats?.protocols || [],
      yields: stats?.yields || [],
      insights: insightsResult.rows,
      opportunities,
      narration,
      portfolioPnL,
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

export async function POST(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  try {
    const { html, title, wallet } = await request.json();
    if (!html) {
      return NextResponse.json({ error: "html is required" }, { status: 400 });
    }
    const db = getPool();
    const result = await db.query(
      `INSERT INTO saved_dashboards (wallet_addr, title, html_content)
       VALUES ($1, $2, $3) RETURNING id, title, created_at`,
      [wallet || null, title || "My Dashboard", html]
    );
    return NextResponse.json(result.rows[0]);
  } catch (err: any) {
    console.error("[dashboard POST] DB error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
