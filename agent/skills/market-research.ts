import { AgentTool } from "../lib/tools.js";
import { fetchProtocols, filterByChain, topByTvl, type Protocol } from "../lib/defillama.js";
import { sha256 } from "../lib/ipfs.js";
import { memory } from "../lib/memory.js";

/**
 * Market Research Tool — fetches DeFi protocol data from DefiLlama
 *
 * Extracts logic from skills/market-research/scripts/fetch-defi-data.ts
 * into the AgentTool pattern for router integration.
 */
export class MarketResearchTool implements AgentTool {
    name = "market-research";
    description =
        "Fetches top DeFi protocols by TVL for a given chain. Input: { chain?: string, top?: number }";

    async execute(input: any): Promise<any> {
        const chain = (input.chain || "arbitrum").toLowerCase();
        const topN = input.top || 5;

        try {
            const allProtocols = await fetchProtocols();
            const chainProtocols = filterByChain(allProtocols, chain);
            const top = topByTvl(chainProtocols, topN);

            if (top.length === 0) {
                return {
                    type: "Market Research",
                    message: `No protocols found on ${chain}.`,
                    suggestion: "Try a different chain like 'ethereum' or 'arbitrum'.",
                };
            }

            const rawJson = JSON.stringify(top);
            const hash = sha256(rawJson);

            const data = top.map((p: Protocol) => ({
                name: p.name,
                tvl: Math.round(p.tvl),
                change_1d: p.change_1d,
                category: p.category,
            }));

            const summaryLines = data.map(
                (p, i) =>
                    `${i + 1}. ${p.name} — $${(p.tvl / 1e6).toFixed(1)}M TVL (${p.category})`
            );

            memory.append(
                `Market research: top ${topN} on ${chain} — #1: ${top[0].name} at $${(top[0].tvl / 1e6).toFixed(1)}M`
            );

            return {
                type: "Market Research",
                chain,
                timestamp: new Date().toISOString(),
                summary: `Top ${topN} ${chain} protocols by TVL:\n${summaryLines.join("\n")}`,
                data,
                dataHash: `sha256:${hash}`,
                source: "defillama",
            };
        } catch (err: any) {
            return {
                type: "Market Research",
                error: "Failed to fetch protocol data",
                details: err.message,
            };
        }
    }
}
