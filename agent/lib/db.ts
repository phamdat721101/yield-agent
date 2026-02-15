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

            console.log('✅ Database initialized');
        } catch (err) {
            console.error('❌ Database init failed:', err);
        }
    },

    saveSnapshot: async (data: any) => {
        return pool.query('INSERT INTO market_snapshots (data) VALUES ($1) RETURNING *', [data]);
    },

    saveInsight: async (title: string, content: string) => {
        return pool.query('INSERT INTO insights (title, content) VALUES ($1, $2) RETURNING *', [title, content]);
    }
};
