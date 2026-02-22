import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

let pool: Pool | null = null;
function getPool() {
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  return pool;
}

// GET /api/chat?wallet=0x...&limit=50
export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet");
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") || "50"), 100);
  if (!wallet || !process.env.DATABASE_URL) return NextResponse.json({ messages: [] });
  try {
    const result = await getPool().query(
      `SELECT id, role, content, metadata, created_at FROM chat_messages
       WHERE wallet_addr = $1 ORDER BY created_at ASC LIMIT $2`,
      [wallet, limit]
    );
    return NextResponse.json({ messages: result.rows });
  } catch {
    return NextResponse.json({ messages: [] });
  }
}

// POST /api/chat — body: { wallet_addr, role, content, metadata? }
export async function POST(request: NextRequest) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  try {
    const { wallet_addr, role, content, metadata = null } = await request.json();
    if (!wallet_addr || !role || !content) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    if (!["user", "agent"].includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    const result = await getPool().query(
      `INSERT INTO chat_messages (wallet_addr, role, content, metadata)
       VALUES ($1, $2, $3, $4::jsonb)
       RETURNING id, role, content, metadata, created_at`,
      [wallet_addr, role, content, metadata ? JSON.stringify(metadata) : null]
    );
    return NextResponse.json({ message: result.rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
