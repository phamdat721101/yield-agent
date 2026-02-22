import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

let pool: Pool | null = null;
function getPool() {
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  return pool;
}

// GET /api/profile?wallet=0x...
export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet");
  if (!wallet || !process.env.DATABASE_URL) return NextResponse.json({ profile: null });
  try {
    const db = getPool();
    const profileResult = await db.query("SELECT * FROM agent_profiles WHERE wallet_addr = $1", [wallet]);
    const profile = profileResult.rows[0] || null;

    let messageCount = 0;
    try {
      const cnt = await db.query("SELECT COUNT(*) as c FROM chat_messages WHERE wallet_addr = $1", [wallet]);
      messageCount = Number(cnt.rows[0]?.c || 0);
    } catch {}

    let recentActivity: any[] = [];
    try {
      const act = await db.query(
        `SELECT protocol, action, amount_usd, apy_at_entry, recorded_at
         FROM portfolio_tracking WHERE wallet_address = $1 ORDER BY recorded_at DESC LIMIT 5`,
        [wallet]
      );
      recentActivity = act.rows;
    } catch {}

    return NextResponse.json({ profile, messageCount, recentActivity });
  } catch {
    return NextResponse.json({ profile: null, messageCount: 0, recentActivity: [] });
  }
}
