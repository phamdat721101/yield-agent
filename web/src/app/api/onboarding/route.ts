import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

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

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ profile: null });
  if (!process.env.DATABASE_URL) return NextResponse.json({ profile: null });

  try {
    const db = getPool();
    const result = await db.query(
      "SELECT * FROM agent_profiles WHERE wallet_addr = $1",
      [wallet]
    );
    return NextResponse.json({ profile: result.rows[0] || null });
  } catch {
    return NextResponse.json({ profile: null });
  }
}

export async function POST(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const {
      wallet_addr,
      user_level = "intermediate",
      agent_style = "yield_sentry",
      risk_tolerance = "moderate",
      focus_assets = ["USDC", "USDT"],
      min_apy_threshold = 1.5,
      whitelisted_protocols = ["aave-v3", "dolomite", "pendle"],
      agent_token_id = null,
    } = body;

    if (!wallet_addr) {
      return NextResponse.json({ error: "wallet_addr is required" }, { status: 400 });
    }

    const db = getPool();
    const result = await db.query(
      `INSERT INTO agent_profiles
         (wallet_addr, user_level, agent_style, risk_tolerance, focus_assets, min_apy_threshold, whitelisted_protocols, agent_token_id, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (wallet_addr) DO UPDATE SET
         user_level = EXCLUDED.user_level,
         agent_style = EXCLUDED.agent_style,
         risk_tolerance = EXCLUDED.risk_tolerance,
         focus_assets = EXCLUDED.focus_assets,
         min_apy_threshold = EXCLUDED.min_apy_threshold,
         whitelisted_protocols = EXCLUDED.whitelisted_protocols,
         agent_token_id = COALESCE(EXCLUDED.agent_token_id, agent_profiles.agent_token_id),
         updated_at = NOW()
       RETURNING *`,
      [wallet_addr, user_level, agent_style, risk_tolerance, focus_assets, min_apy_threshold, whitelisted_protocols, agent_token_id]
    );

    return NextResponse.json({ profile: result.rows[0] });
  } catch (err: any) {
    console.error("[onboarding] DB error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
