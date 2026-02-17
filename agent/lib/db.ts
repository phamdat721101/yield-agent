import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Supabase
});

export const db = {
    query: (text: string, params?: any[]) => pool.query(text, params),

    init: async () => {
        try {
            // 1. Snapshot Table (Raw Data)
            await pool.query(`
        CREATE TABLE IF NOT EXISTS market_snapshots (
          id SERIAL PRIMARY KEY,
          data JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);

            // 2. Insights Table (AI Reports)
            await pool.query(`
        CREATE TABLE IF NOT EXISTS insights (
          id SERIAL PRIMARY KEY,
          title TEXT,
          content TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);

            // 3. Arbitrum Stats Table (Protocol + Yield merged data)
            await pool.query(`
        CREATE TABLE IF NOT EXISTS arbitrum_stats (
          id SERIAL PRIMARY KEY,
          protocols JSONB NOT NULL,
          yields JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);

            // 4. Pool Snapshots Table (Scored cross-protocol opportunities)
            await pool.query(`
        CREATE TABLE IF NOT EXISTS pool_snapshots (
          id         SERIAL PRIMARY KEY,
          protocol   TEXT NOT NULL,
          pool_id    TEXT NOT NULL,
          pool_name  TEXT NOT NULL,
          category   TEXT NOT NULL,
          tokens     TEXT[] NOT NULL,
          tvl_usd    NUMERIC NOT NULL,
          apy_base   NUMERIC,
          apy_reward NUMERIC,
          apy_total  NUMERIC,
          risk_score NUMERIC,
          opp_score  NUMERIC,
          extra      JSONB,
          fetched_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_ps_fetched ON pool_snapshots(fetched_at DESC);`);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_ps_opp ON pool_snapshots(opp_score DESC NULLS LAST);`);

            console.log('Database initialized');
        } catch (err) {
            console.error('Database init failed:', err);
        }
    },

    saveSnapshot: async (data: any) => {
        return pool.query('INSERT INTO market_snapshots (data) VALUES ($1) RETURNING *', [data]);
    },

    saveInsight: async (title: string, content: string) => {
        return pool.query('INSERT INTO insights (title, content) VALUES ($1, $2) RETURNING *', [title, content]);
    },

    saveArbitrumStats: async (protocols: any, yields: any) => {
        return pool.query(
            'INSERT INTO arbitrum_stats (protocols, yields) VALUES ($1, $2) RETURNING *',
            [JSON.stringify(protocols), JSON.stringify(yields)]
        );
    },

    getArbitrumStats: async (limit = 1) => {
        const result = await pool.query(
            'SELECT * FROM arbitrum_stats ORDER BY created_at DESC LIMIT $1',
            [limit]
        );
        return result.rows;
    },

    getLatestInsights: async (limit = 5) => {
        const result = await pool.query(
            'SELECT * FROM insights ORDER BY created_at DESC LIMIT $1',
            [limit]
        );
        return result.rows;
    },

    savePoolSnapshots: async (pools: Array<{
        protocol: string; pool_id: string; pool_name: string; category: string;
        tokens: string[]; tvl_usd: number; apy_base: number | null;
        apy_reward: number | null; apy_total: number | null;
        risk_score: number; opp_score: number; extra?: Record<string, unknown>;
    }>) => {
        if (pools.length === 0) return;
        const BATCH = 50;
        for (let i = 0; i < pools.length; i += BATCH) {
            const batch = pools.slice(i, i + BATCH);
            const values: any[] = [];
            const rows: string[] = [];
            batch.forEach((p, idx) => {
                const off = idx * 12;
                rows.push(`($${off+1},$${off+2},$${off+3},$${off+4},$${off+5},$${off+6},$${off+7},$${off+8},$${off+9},$${off+10},$${off+11},$${off+12})`);
                values.push(
                    p.protocol, p.pool_id, p.pool_name, p.category,
                    p.tokens, p.tvl_usd, p.apy_base, p.apy_reward,
                    p.apy_total, p.risk_score, p.opp_score,
                    p.extra ? JSON.stringify(p.extra) : null
                );
            });
            await pool.query(
                `INSERT INTO pool_snapshots (protocol, pool_id, pool_name, category, tokens, tvl_usd, apy_base, apy_reward, apy_total, risk_score, opp_score, extra) VALUES ${rows.join(',')}`,
                values
            );
        }
    },

    getTopOpportunities: async (asset?: string, limit = 10) => {
        // Get latest batch (within last 12 hours)
        let query = `SELECT * FROM pool_snapshots WHERE fetched_at > NOW() - INTERVAL '12 hours'`;
        const params: any[] = [];
        if (asset && asset.toUpperCase() !== 'ALL') {
            params.push(asset.toUpperCase());
            query += ` AND $${params.length} = ANY(tokens)`;
        }
        query += ` ORDER BY opp_score DESC NULLS LAST LIMIT $${params.length + 1}`;
        params.push(limit);
        const result = await pool.query(query, params);
        return result.rows;
    },

    cleanOldSnapshots: async () => {
        await pool.query(`DELETE FROM pool_snapshots WHERE fetched_at < NOW() - INTERVAL '7 days'`);
    },
};
