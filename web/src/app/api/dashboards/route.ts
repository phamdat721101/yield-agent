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

/** GET /api/dashboards?wallet=<addr> — list saved dashboards */
export async function GET(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ dashboards: [] });
  }

  const wallet = request.nextUrl.searchParams.get("wallet");

  try {
    const db = getPool();
    const result = await db.query(
      `SELECT id, wallet_addr, title, created_at
       FROM saved_dashboards
       WHERE wallet_addr IS NOT DISTINCT FROM $1
       ORDER BY created_at DESC`,
      [wallet || null]
    );
    return NextResponse.json({ dashboards: result.rows });
  } catch (err: any) {
    console.error("[dashboards GET] DB error:", err.message);
    return NextResponse.json({ dashboards: [] });
  }
}

/** DELETE /api/dashboards?id=<uuid> — delete a saved dashboard */
export async function DELETE(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    const db = getPool();
    await db.query("DELETE FROM saved_dashboards WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[dashboards DELETE] DB error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
