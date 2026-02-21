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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const { id } = await params;

  try {
    const db = getPool();
    const result = await db.query(
      "SELECT id, wallet_addr, title, html_content, created_at FROM saved_dashboards WHERE id = $1",
      [id]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (err: any) {
    console.error("[dashboards/[id] GET] DB error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
