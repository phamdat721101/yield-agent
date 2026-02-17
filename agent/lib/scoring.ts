/**
 * Pool opportunity scoring — pure functions, no side effects.
 *
 * opp_score = apyPoints + tvlPoints - riskPenalty   (0-100 scale)
 */

export interface PoolSnapshot {
  protocol: string;
  pool_id: string;
  pool_name: string;
  category: string;       // lending, dex, yield, derivatives
  tokens: string[];
  tvl_usd: number;
  apy_base: number | null;
  apy_reward: number | null;
  apy_total: number | null;
  extra?: Record<string, unknown>;
}

export interface ScoredPool extends PoolSnapshot {
  risk_score: number;
  opp_score: number;
}

function computeRiskScore(pool: PoolSnapshot): number {
  const apy = pool.apy_total ?? 0;
  const tvl = pool.tvl_usd;
  const cat = pool.category.toLowerCase();

  let score = 0;

  // APY outlier risk
  if (apy > 100) score += 40;
  else if (apy > 50) score += 20;
  else if (apy > 25) score += 10;

  // Low TVL risk
  if (tvl < 100_000) score += 35;
  else if (tvl < 1_000_000) score += 20;
  else if (tvl < 10_000_000) score += 10;

  // Category premium
  if (cat === 'derivatives') score += 20;
  else if (cat === 'yield') score += 15;
  else if (cat === 'dex') score += 10;
  else if (cat === 'lending') score += 5;

  return Math.min(100, score);
}

export function scorePool(pool: PoolSnapshot): ScoredPool {
  const apy = pool.apy_total ?? 0;
  const tvl = pool.tvl_usd;

  const apyPoints = Math.min(40, apy * 0.8);
  const tvlPoints = tvl > 0 ? Math.min(30, Math.log10(tvl) * 3.3) : 0;
  const riskScore = computeRiskScore(pool);
  const riskPenalty = riskScore * 0.3;

  const oppScore = Math.max(0, Math.min(100, apyPoints + tvlPoints - riskPenalty));

  return {
    ...pool,
    risk_score: Math.round(riskScore * 100) / 100,
    opp_score: Math.round(oppScore * 100) / 100,
  };
}

export function scorePools(pools: PoolSnapshot[]): ScoredPool[] {
  return pools.map(scorePool).sort((a, b) => b.opp_score - a.opp_score);
}
