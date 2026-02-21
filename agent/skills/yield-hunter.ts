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
import { detectUserLevel } from "../lib/level-detector.js";
import { generateDashboardHTML, type ScoredPool } from "../lib/html-generator.js";

/**
 * Yield Hunter Tool — Core OpenClawd Feature
 *
 * Fetches real yield data from DefiLlama Yields API,
 * filters for Arbitrum chain and target assets (WBTC, USDC, USDT),
 * and returns top opportunities sorted by APY.
 *
 * When input.mode === 'html' or the message contains "show me" / "visualize" /
 * "build dashboard" / "generate report", returns a level-aware HTML dashboard.
 */
export class YieldHunterTool implements AgentTool {
    name = "yield-hunter";
    description =
        "Finds the best yield opportunities on Arbitrum for BTC and Stablecoins. Input: { asset?: 'USDC' | 'WBTC' | 'all', mode?: 'html', userLevel?: string }";

    async execute(input: any): Promise<any> {
        const asset = (input.asset || input.coin || "all").toUpperCase();
        const chain = "Arbitrum";
        const message = input.message || "";
        const lc = message.toLowerCase();

        const wantsHtml = input.mode === "html"
            || lc.includes("show me")
            || lc.includes("visualize")
            || (lc.includes("build") && lc.includes("dashboard"))
            || lc.includes("generate report")
            || lc.includes("html dashboard");

        // DB-first: try scored pool snapshots
        try {
            const scored = await db.getTopOpportunities(asset === "ALL" ? undefined : asset, wantsHtml ? 20 : 5);
            if (scored.length > 0) {
                if (wantsHtml) {
                    const level = detectUserLevel(message, input.userLevel);
                    const pools: ScoredPool[] = scored.map((r: any) => ({
                        protocol: r.protocol,
                        pool_name: r.pool_name,
                        category: r.category,
                        tokens: r.tokens,
                        tvl_usd: Number(r.tvl_usd),
                        apy_total: r.apy_total != null ? Number(r.apy_total) : null,
                        risk_score: Number(r.risk_score),
                        opp_score: Number(r.opp_score),
                    }));
                    const html = await generateDashboardHTML(pools, level, message);
                    memory.append(`HTML dashboard (scored, ${level}): ${asset} on ${chain}`);
                    return { type: "html", content: html };
                }

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

            const top = topYieldsByApy(pools, wantsHtml ? 20 : 5);

            if (top.length === 0) {
                return {
                    type: "Yield Report",
                    message: `No yield pools found for ${asset} on ${chain}.`,
                    suggestion: "Try broadening your search to 'all' assets.",
                };
            }

            if (wantsHtml) {
                const level = detectUserLevel(message, input.userLevel);
                const scoredPools: ScoredPool[] = top.map((p) => ({
                    protocol: p.project,
                    pool_name: p.symbol,
                    category: "yield",
                    tokens: p.symbol.split(/[-\/]/).map((t) => t.trim().toUpperCase()).filter(Boolean),
                    tvl_usd: p.tvlUsd,
                    apy_total: p.apy ?? null,
                    risk_score: 20,
                    opp_score: p.apy ?? 0,
                }));
                const html = await generateDashboardHTML(scoredPools, level, message);
                memory.append(`HTML dashboard (live, ${level}): ${asset} on ${chain}`);
                return { type: "html", content: html };
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
