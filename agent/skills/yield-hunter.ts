import { AgentTool } from "../lib/tools.js";
import {
    fetchYields,
    filterYieldsByChain,
    filterYieldsByAsset,
    topYieldsByApy,
    type YieldPool,
} from "../lib/defillama.js";
import { memory } from "../lib/memory.js";
import { db } from "../lib/db.js";

/**
 * Yield Hunter Tool — Core OpenClawd Feature
 *
 * Fetches real yield data from DefiLlama Yields API,
 * filters for Arbitrum chain and target assets (WBTC, USDC, USDT),
 * and returns top opportunities sorted by APY.
 */
export class YieldHunterTool implements AgentTool {
    name = "yield-hunter";
    description =
        "Finds the best yield opportunities on Arbitrum for BTC and Stablecoins. Input: { asset?: 'USDC' | 'WBTC' | 'all' }";

    async execute(input: any): Promise<any> {
        const asset = (input.asset || input.coin || "all").toUpperCase();
        const chain = "Arbitrum";

        // DB-first: try scored pool snapshots
        try {
            const scored = await db.getTopOpportunities(asset === "ALL" ? undefined : asset, 5);
            if (scored.length > 0) {
                const report = this.formatScoredReport(scored, asset, chain);
                memory.append(
                    `Yield scan (scored): ${asset} on ${chain} — top score: ${scored[0].opp_score} (${scored[0].protocol})`
                );
                return report;
            }
        } catch {
            // DB unavailable — fall through to live API
        }

        // Live fallback: fetch directly from DefiLlama
        try {
            const allPools = await fetchYields();

            // Filter by chain
            let pools = filterYieldsByChain(allPools, chain);

            // Optionally filter by asset
            if (asset !== "ALL") {
                pools = filterYieldsByAsset(pools, asset);
            }

            const top = topYieldsByApy(pools, 5);

            if (top.length === 0) {
                return {
                    type: "Yield Report",
                    message: `No yield pools found for ${asset} on ${chain}.`,
                    suggestion: "Try broadening your search to 'all' assets.",
                };
            }

            const report = this.formatReport(top, asset, chain);

            // Save to memory for learning
            memory.append(
                `Yield scan: ${asset} on ${chain} — top APY: ${top[0].apy?.toFixed(2)}% (${top[0].project})`
            );

            return report;
        } catch (err: any) {
            return {
                type: "Yield Report",
                error: "Failed to fetch yield data",
                details: err.message,
            };
        }
    }

    private formatScoredReport(rows: any[], asset: string, chain: string) {
        return {
            type: "Yield Report",
            chain,
            asset,
            source: "scored",
            timestamp: new Date().toISOString(),
            opportunities: rows.map((r: any, i: number) => ({
                rank: i + 1,
                protocol: r.protocol,
                pool: r.pool_name,
                category: r.category,
                tokens: r.tokens,
                apy: r.apy_total != null ? `${Number(r.apy_total).toFixed(2)}%` : "N/A",
                tvl: `$${(Number(r.tvl_usd) / 1e6).toFixed(2)}M`,
                opportunityScore: Number(r.opp_score),
                riskScore: Number(r.risk_score),
            })),
            summary: `Found ${rows.length} scored opportunities for ${asset} on ${chain}. Best: ${rows[0].protocol} (${rows[0].pool_name}) with score ${Number(rows[0].opp_score).toFixed(1)}.`,
        };
    }

    private formatReport(pools: YieldPool[], asset: string, chain: string) {
        return {
            type: "Yield Report",
            chain,
            asset,
            timestamp: new Date().toISOString(),
            opportunities: pools.map((p, i) => ({
                rank: i + 1,
                protocol: p.project,
                pool: p.symbol,
                apy: `${(p.apy ?? 0).toFixed(2)}%`,
                tvl: `$${(p.tvlUsd / 1e6).toFixed(2)}M`,
                apyBase: p.apyBase != null ? `${p.apyBase.toFixed(2)}%` : "N/A",
                apyReward: p.apyReward != null ? `${p.apyReward.toFixed(2)}%` : "N/A",
            })),
            summary: `Found ${pools.length} yield opportunities for ${asset} on ${chain}. Best: ${pools[0].project} at ${(pools[0].apy ?? 0).toFixed(2)}% APY.`,
        };
    }
}
