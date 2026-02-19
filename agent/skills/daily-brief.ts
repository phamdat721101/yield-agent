import { AgentTool } from "../lib/tools.js";
import { MarketResearchTool } from "./market-research.js";
import { TrustStampTool } from "./trust-stamp.js";
import { GeminiService } from "../lib/gemini.js";
import { sha256 } from "../lib/ipfs.js";
import { memory } from "../lib/memory.js";
import { db } from "../lib/db.js";

/**
 * Daily Brief Tool — composite report combining market research + AI summary + trust stamp
 */
export class DailyBriefTool implements AgentTool {
    name = "daily-brief";
    description =
        "Generates a comprehensive daily DeFi brief with market data, AI analysis, and a signed attestation.";

    private marketResearch = new MarketResearchTool();
    private trustStamp = new TrustStampTool();

    async execute(input: any): Promise<any> {
        try {
            // 1. Gather market data across chains
            const chains = ["arbitrum", "ethereum", "base"];
            const reports = await Promise.all(
                chains.map((chain) =>
                    this.marketResearch.execute({ chain, top: 3 })
                )
            );

            // 2. Build summary from all chain data
            const chainSummaries = reports
                .filter((r) => !r.error)
                .map((r) => r.summary || "No data")
                .join("\n\n");

            // 3. Generate narration via Yield Sentry persona
            let topOpportunities: any[] = [];
            try {
                topOpportunities = await db.getTopOpportunities(undefined, 5);
            } catch { /* ignore */ }

            let aiSummary: string;
            try {
                const yieldChanges = reports
                    .filter((r) => !r.error)
                    .map((r) => ({ chain: r.chain, data: r.summary }));
                aiSummary = await GeminiService.generateNarration(yieldChanges, topOpportunities);
                await db.saveNarration(aiSummary, yieldChanges);
            } catch {
                aiSummary =
                    "AI analysis unavailable. See raw data below.";
            }

            // 4. Sign the brief
            const briefHash = sha256(JSON.stringify({ chainSummaries, aiSummary }));
            const stamp = await this.trustStamp.execute({ dataHash: `sha256:${briefHash}` });

            memory.append(`Daily brief generated for ${chains.join(", ")}`);

            return {
                type: "Daily Brief",
                timestamp: new Date().toISOString(),
                aiSummary,
                chainReports: reports.filter((r) => !r.error),
                attestation: stamp.error ? null : {
                    signature: stamp.signature,
                    signer: stamp.signer,
                    ipfsCid: stamp.ipfsCid,
                },
                dataHash: `sha256:${briefHash}`,
            };
        } catch (err: any) {
            return {
                type: "Daily Brief",
                error: "Failed to generate brief",
                details: err.message,
            };
        }
    }
}
