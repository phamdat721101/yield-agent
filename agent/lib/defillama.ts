/**
 * DefiLlama API wrapper — free, no auth required
 * Docs: https://defillama.com/docs/api
 */

const BASE_URL = "https://api.llama.fi";

export interface Protocol {
  id: string;
  name: string;
  symbol: string;
  chain: string;
  tvl: number;
  change_1d: number | null;
  change_7d: number | null;
  category: string;
}

export interface ChainTvl {
  name: string;
  tvl: number;
}

export async function fetchProtocols(): Promise<Protocol[]> {
  const res = await fetch(`${BASE_URL}/protocols`);
  if (!res.ok) throw new Error(`DefiLlama /protocols failed: ${res.status}`);
  return res.json();
}

export async function fetchChains(): Promise<ChainTvl[]> {
  const res = await fetch(`${BASE_URL}/v2/chains`);
  if (!res.ok) throw new Error(`DefiLlama /v2/chains failed: ${res.status}`);
  return res.json();
}

export async function fetchProtocolTvl(slug: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/tvl/${slug}`);
  if (!res.ok) throw new Error(`DefiLlama /tvl/${slug} failed: ${res.status}`);
  return res.json();
}

/** Filter protocols by chain name (case-insensitive) */
export function filterByChain(protocols: Protocol[], chain: string): Protocol[] {
  const lc = chain.toLowerCase();
  return protocols.filter(
    (p) =>
      p.chain?.toLowerCase() === lc ||
      (p as any).chains?.some((c: string) => c.toLowerCase() === lc)
  );
}

/** Get top N protocols sorted by TVL */
export function topByTvl(protocols: Protocol[], n: number): Protocol[] {
  return [...protocols].sort((a, b) => b.tvl - a.tvl).slice(0, n);
}

// ── Yields API ──────────────────────────────────────────────────

const YIELDS_URL = "https://yields.llama.fi";

export interface YieldPool {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number | null;
  apyBase: number | null;
  apyReward: number | null;
}

export async function fetchYields(): Promise<YieldPool[]> {
  const res = await fetch(`${YIELDS_URL}/pools`);
  if (!res.ok) throw new Error(`DefiLlama /pools failed: ${res.status}`);
  const json = await res.json();
  return json.data ?? [];
}

export function filterYieldsByChain(pools: YieldPool[], chain: string): YieldPool[] {
  const lc = chain.toLowerCase();
  return pools.filter((p) => p.chain?.toLowerCase() === lc);
}

export function filterYieldsByAsset(pools: YieldPool[], asset: string): YieldPool[] {
  const lc = asset.toLowerCase();
  return pools.filter((p) => p.symbol?.toLowerCase().includes(lc));
}

export function topYieldsByApy(pools: YieldPool[], n: number): YieldPool[] {
  return [...pools]
    .filter((p) => p.apy != null && p.tvlUsd > 10_000)
    .sort((a, b) => (b.apy ?? 0) - (a.apy ?? 0))
    .slice(0, n);
}
