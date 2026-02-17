/**
 * Protocol connectors — fetch yield data from multiple DeFi sources on Arbitrum.
 *
 * Uses Promise.allSettled so one failing connector doesn't block others.
 * DefiLlama fetch is cached with a 5-min TTL to avoid redundant API calls.
 */

import {
  fetchYields,
  filterYieldsByChain,
  type YieldPool,
} from './defillama.js';
import type { PoolSnapshot } from './scoring.js';

// ── Shared interface ──

export interface Connector {
  name: string;
  fetch(): Promise<PoolSnapshot[]>;
}

// ── DefiLlama cache (5-min TTL) ──

let yieldsCache: { data: YieldPool[]; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

async function getCachedYields(): Promise<YieldPool[]> {
  if (yieldsCache && Date.now() - yieldsCache.ts < CACHE_TTL) {
    return yieldsCache.data;
  }
  const data = await fetchYields();
  yieldsCache = { data, ts: Date.now() };
  return data;
}

function categorize(project: string, llamaCategory?: string): string {
  const lc = (llamaCategory || project).toLowerCase();
  if (lc.includes('lend') || lc.includes('borrow')) return 'lending';
  if (lc.includes('dex') || lc.includes('amm') || lc.includes('liquidity')) return 'dex';
  if (lc.includes('deriv') || lc.includes('perp') || lc.includes('option')) return 'derivatives';
  return 'yield';
}

function parseTokens(symbol: string): string[] {
  return symbol
    .replace(/[()]/g, '')
    .split(/[-\/,]/)
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
}

// ── The Graph helper ──

async function querySubgraph(subgraphId: string, query: string): Promise<any> {
  const apiKey = process.env.THEGRAPH_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(
    `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/${subgraphId}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    }
  );
  if (!res.ok) throw new Error(`Subgraph query failed: ${res.status}`);
  return res.json();
}

// ── 1. DefiLlama Connector (broad Arbitrum coverage) ──

class DefiLlamaConnector implements Connector {
  name = 'defillama';

  async fetch(): Promise<PoolSnapshot[]> {
    const all = await getCachedYields();
    const arb = filterYieldsByChain(all, 'Arbitrum');

    return arb
      .filter((p) => p.tvlUsd > 10_000)
      .map((p) => ({
        protocol: p.project,
        pool_id: p.pool,
        pool_name: p.symbol,
        category: categorize(p.project),
        tokens: parseTokens(p.symbol),
        tvl_usd: p.tvlUsd,
        apy_base: p.apyBase,
        apy_reward: p.apyReward,
        apy_total: p.apy,
      }));
  }
}

// ── 2. Aave V3 Connector (The Graph subgraph) ──

const AAVE_V3_ARB_SUBGRAPH = 'GQFbb95cE6d8mV989mL5figjaGaKCQB3xqYrr1bRyXqF';
const RAY = 1e27;

class AaveConnector implements Connector {
  name = 'aave';

  async fetch(): Promise<PoolSnapshot[]> {
    const result = await querySubgraph(
      AAVE_V3_ARB_SUBGRAPH,
      `{ reserves(first: 50, where: { isActive: true }) {
        id underlyingAsset symbol name
        liquidityRate variableBorrowRate
        totalATokenSupply totalCurrentVariableDebt
        decimals
      }}`
    );
    if (!result?.data?.reserves) return [];

    return result.data.reserves.map((r: any) => {
      const supplyAPY = (Number(r.liquidityRate) / RAY) * 100;
      const decimals = Number(r.decimals) || 18;
      const tvl = Number(r.totalATokenSupply) / 10 ** decimals;

      return {
        protocol: 'aave-v3',
        pool_id: r.id,
        pool_name: `${r.symbol} Supply`,
        category: 'lending',
        tokens: [r.symbol.toUpperCase()],
        tvl_usd: tvl, // approximate — no price oracle here
        apy_base: supplyAPY,
        apy_reward: null,
        apy_total: supplyAPY,
        extra: { underlyingAsset: r.underlyingAsset },
      };
    });
  }
}

// ── 3. GMX Connector (via DefiLlama yields) ──

class GmxConnector implements Connector {
  name = 'gmx';

  async fetch(): Promise<PoolSnapshot[]> {
    const all = await getCachedYields();
    const gmx = filterYieldsByChain(all, 'Arbitrum').filter(
      (p) => p.project.toLowerCase().includes('gmx')
    );

    return gmx
      .filter((p) => p.tvlUsd > 10_000)
      .map((p) => ({
        protocol: 'gmx',
        pool_id: p.pool,
        pool_name: p.symbol,
        category: 'derivatives',
        tokens: parseTokens(p.symbol),
        tvl_usd: p.tvlUsd,
        apy_base: p.apyBase,
        apy_reward: p.apyReward,
        apy_total: p.apy,
      }));
  }
}

// ── 4. Pendle Connector (REST API) ──

class PendleConnector implements Connector {
  name = 'pendle';

  async fetch(): Promise<PoolSnapshot[]> {
    const res = await fetch(
      'https://api-v2.pendle.finance/core/v1/42161/markets?order_by=name%3A1&skip=0&limit=50'
    );
    if (!res.ok) throw new Error(`Pendle API failed: ${res.status}`);

    const json = await res.json();
    const markets: any[] = json.results ?? json ?? [];

    return markets.map((m: any) => ({
      protocol: 'pendle',
      pool_id: m.address || m.id || '',
      pool_name: m.name || m.proName || 'Pendle Market',
      category: 'yield',
      tokens: parseTokens(m.underlyingAsset?.symbol || m.name || ''),
      tvl_usd: m.liquidity?.usd ?? m.totalTvl ?? 0,
      apy_base: m.impliedApy != null ? m.impliedApy * 100 : null,
      apy_reward: null,
      apy_total: m.impliedApy != null ? m.impliedApy * 100 : null,
      extra: {
        maturity: m.expiry || m.maturity,
        ptDiscount: m.ptDiscount,
      },
    }));
  }
}

// ── 5. Dolomite Connector (via DefiLlama yields) ──

class DolomiteConnector implements Connector {
  name = 'dolomite';

  async fetch(): Promise<PoolSnapshot[]> {
    const all = await getCachedYields();
    const dolo = filterYieldsByChain(all, 'Arbitrum').filter(
      (p) => p.project.toLowerCase().includes('dolomite')
    );

    return dolo
      .filter((p) => p.tvlUsd > 10_000)
      .map((p) => ({
        protocol: 'dolomite',
        pool_id: p.pool,
        pool_name: p.symbol,
        category: 'lending',
        tokens: parseTokens(p.symbol),
        tvl_usd: p.tvlUsd,
        apy_base: p.apyBase,
        apy_reward: p.apyReward,
        apy_total: p.apy,
      }));
  }
}

// ── Deduplication ──

function deduplicatePools(pools: PoolSnapshot[]): PoolSnapshot[] {
  const seen = new Map<string, PoolSnapshot>();
  for (const p of pools) {
    // Prefer native connector data (non-defillama) over defillama
    const key = `${p.pool_name.toLowerCase()}-${p.tokens.sort().join('/')}`;
    const existing = seen.get(key);
    if (!existing || (existing.protocol === 'defillama' && p.protocol !== 'defillama')) {
      seen.set(key, p);
    }
  }
  return Array.from(seen.values());
}

// ── Run all connectors ──

const connectors: Connector[] = [
  new DefiLlamaConnector(),
  new AaveConnector(),
  new GmxConnector(),
  new PendleConnector(),
  new DolomiteConnector(),
];

export async function runAllConnectors(): Promise<PoolSnapshot[]> {
  const results = await Promise.allSettled(
    connectors.map(async (c) => {
      const start = Date.now();
      try {
        const pools = await c.fetch();
        console.log(`[connector] ${c.name}: ${pools.length} pools (${Date.now() - start}ms)`);
        return pools;
      } catch (err: any) {
        console.warn(`[connector] ${c.name} failed: ${err.message}`);
        throw err;
      }
    })
  );

  const allPools: PoolSnapshot[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') {
      allPools.push(...r.value);
    }
  }

  return deduplicatePools(allPools);
}
