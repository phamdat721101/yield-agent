import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') || process.env.DATABASE_URL?.includes('127.0.0.1')
        ? false
        : { rejectUnauthorized: false }
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

            // 5. Narrations Table (Market Stories)
            await pool.query(`
        CREATE TABLE IF NOT EXISTS narrations (
          id SERIAL PRIMARY KEY,
          content TEXT NOT NULL,
          yield_changes JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);

            // 6. Portfolio Tracking Table
            await pool.query(`
        CREATE TABLE IF NOT EXISTS portfolio_tracking (
          id SERIAL PRIMARY KEY,
          wallet_address TEXT NOT NULL,
          protocol TEXT NOT NULL,
          pool_id TEXT NOT NULL,
          action TEXT NOT NULL,
          amount_usd NUMERIC NOT NULL,
          apy_at_entry NUMERIC,
          recorded_at TIMESTAMP DEFAULT NOW()
        );
      `);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_pt_wallet ON portfolio_tracking(wallet_address);`);

            // 7. Agent Profiles Table (per wallet)
            await pool.query(`
        CREATE TABLE IF NOT EXISTS agent_profiles (
          id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          wallet_addr  TEXT NOT NULL UNIQUE,
          user_level   TEXT NOT NULL DEFAULT 'intermediate',
          agent_style  TEXT NOT NULL DEFAULT 'yield_sentry',
          risk_tolerance TEXT NOT NULL DEFAULT 'moderate',
          focus_assets TEXT[] NOT NULL DEFAULT ARRAY['USDC','USDT'],
          min_apy_threshold NUMERIC NOT NULL DEFAULT 1.5,
          whitelisted_protocols TEXT[] NOT NULL DEFAULT ARRAY['aave-v3','dolomite','pendle'],
          agent_token_id INTEGER,
          created_at   TIMESTAMP DEFAULT NOW(),
          updated_at   TIMESTAMP DEFAULT NOW()
        );
      `);
            await pool.query(`
        ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS agent_token_id INTEGER;
      `);

            // 8. Saved Dashboards Table
            await pool.query(`
        CREATE TABLE IF NOT EXISTS saved_dashboards (
          id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          wallet_addr  TEXT,
          title        TEXT NOT NULL,
          html_content TEXT NOT NULL,
          created_at   TIMESTAMP DEFAULT NOW()
        );
      `);

            console.log('Database initialized');
        } catch (err) {
            console.error('Database init failed:', err);
        }
    },

    saveSnapshot: async (data: any) => {
        return pool.query('INSERT INTO market_snapshots (data) VALUES ($1::jsonb) RETURNING *', [JSON.stringify(data)]);
    },

    saveInsight: async (title: string, content: string) => {
        return pool.query('INSERT INTO insights (title, content) VALUES ($1, $2) RETURNING *', [title, content]);
    },

    saveArbitrumStats: async (protocols: any, yields: any) => {
        return pool.query(
            'INSERT INTO arbitrum_stats (protocols, yields) VALUES ($1::jsonb, $2::jsonb) RETURNING *',
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
                rows.push(`($${off + 1},$${off + 2},$${off + 3},$${off + 4},$${off + 5},$${off + 6},$${off + 7},$${off + 8},$${off + 9},$${off + 10},$${off + 11},$${off + 12})`);
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

    saveNarration: async (content: string, yieldChanges?: any[]) => {
        return pool.query(
            'INSERT INTO narrations (content, yield_changes) VALUES ($1, $2::jsonb) RETURNING *',
            [content, yieldChanges ? JSON.stringify(yieldChanges) : null]
        );
    },

    getLatestNarration: async () => {
        const result = await pool.query(
            'SELECT content, created_at FROM narrations ORDER BY created_at DESC LIMIT 1'
        );
        return result.rows[0] || null;
    },

    savePortfolioAction: async (action: {
        wallet_address: string; protocol: string; pool_id: string;
        action: string; amount_usd: number; apy_at_entry?: number;
    }) => {
        return pool.query(
            `INSERT INTO portfolio_tracking (wallet_address, protocol, pool_id, action, amount_usd, apy_at_entry)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [action.wallet_address, action.protocol, action.pool_id, action.action, action.amount_usd, action.apy_at_entry ?? null]
        );
    },

    saveProfile: async (profile: {
        wallet_addr: string; user_level: string; agent_style: string;
        risk_tolerance: string; focus_assets: string[];
        min_apy_threshold: number; whitelisted_protocols: string[];
        agent_token_id?: number | null;
    }) => {
        return pool.query(
            `INSERT INTO agent_profiles (wallet_addr, user_level, agent_style, risk_tolerance, focus_assets, min_apy_threshold, whitelisted_protocols, agent_token_id, updated_at)
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
            [profile.wallet_addr, profile.user_level, profile.agent_style,
             profile.risk_tolerance, profile.focus_assets,
             profile.min_apy_threshold, profile.whitelisted_protocols,
             profile.agent_token_id ?? null]
        );
    },

    getProfile: async (wallet_addr: string) => {
        const result = await pool.query(
            'SELECT * FROM agent_profiles WHERE wallet_addr = $1',
            [wallet_addr]
        );
        return result.rows[0] || null;
    },

    saveDashboard: async (wallet_addr: string | null, title: string, html: string) => {
        const result = await pool.query(
            `INSERT INTO saved_dashboards (wallet_addr, title, html_content)
             VALUES ($1, $2, $3) RETURNING id, title, created_at`,
            [wallet_addr, title, html]
        );
        return result.rows[0];
    },

    getDashboards: async (wallet_addr: string | null) => {
        const result = await pool.query(
            `SELECT id, wallet_addr, title, created_at FROM saved_dashboards
             WHERE wallet_addr IS NOT DISTINCT FROM $1
             ORDER BY created_at DESC`,
            [wallet_addr]
        );
        return result.rows;
    },

    deleteDashboard: async (id: string) => {
        await pool.query('DELETE FROM saved_dashboards WHERE id = $1', [id]);
    },

    getDashboardById: async (id: string) => {
        const result = await pool.query(
            'SELECT * FROM saved_dashboards WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    },

    getPortfolioPnL: async (wallet: string) => {
        const result = await pool.query(
            `SELECT action, amount_usd, apy_at_entry, recorded_at FROM portfolio_tracking WHERE wallet_address = $1 ORDER BY recorded_at`,
            [wallet]
        );
        const rows = result.rows;
        if (rows.length === 0) return null;

        let totalDeposited = 0;
        let totalWithdrawn = 0;
        let weightedApySum = 0;
        let weightedAmount = 0;

        const now = Date.now();
        let estimatedEarnings = 0;

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

        const netPnL = totalWithdrawn + estimatedEarnings - totalDeposited;
        const effectiveApy = weightedAmount > 0 ? weightedApySum / weightedAmount : 0;

        return {
            totalDeposited: Math.round(totalDeposited * 100) / 100,
            totalWithdrawn: Math.round(totalWithdrawn * 100) / 100,
            estimatedEarnings: Math.round(estimatedEarnings * 100) / 100,
            netPnL: Math.round(netPnL * 100) / 100,
            effectiveApy: Math.round(effectiveApy * 100) / 100,
        };
    },
};
