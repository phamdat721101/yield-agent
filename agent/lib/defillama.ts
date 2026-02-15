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
