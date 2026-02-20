import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

if (!process.env.GEMINI_KEY) {
    console.warn("⚠️ GEMINI_KEY is missing. AI features will be disabled.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export const GeminiService = {
    /**
     * General purpose chat/research generation
     */
    generate: async (prompt: string): Promise<string> => {
        try {
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error: any) {
            console.error("Gemini Error:", error);
            return "I'm having trouble thinking right now. Please try again later.";
        }
    },

    /**
     * Analyze raw DefiLlama data and produce a structured report
     */
    generateInsight: async (data: any): Promise<string> => {
        const prompt = `You are OpenClaw, LionHeart's verifiable DeFi intelligence agent on Arbitrum.

PROTOCOL KNOWLEDGE: Aave V3 (Green, 3-6% USDC APY, $8B TVL), Morpho (Green, P2P optimizer over Aave, +1-2% when matched), Dolomite (Yellow, 5-12%, isolated margin), Pendle (Yellow, PT=fixed rate YT=variable, rate-lock strategy), Curve (Yellow, stablecoin DEX, CRV+fee 2-5%), Balancer (Yellow, weighted pools, BAL rewards 3-15%), Camelot (Yellow, Arbitrum DEX, GRAIL incentives, IL risk), Radiant (Yellow, RDNT inflation risk), GMX V2 (Red, 15-30% from trading fees, PnL exposure), Jones DAO (Red, leveraged yield 8-25%, JONES incentives).

STRATEGY PLAYBOOKS: Newbie → USDC into Aave V3 or Morpho (3-6%, minimal risk). Intermediate → Aave base + Pendle PT fixed rate + Curve stable-stable LP. Advanced → loop wstETH on Dolomite + delta-neutral GMX GLP hedge with perp short.

RISK TIERS: Green = audited, >$100M TVL, stablecoins. Yellow = medium TVL, IL or token risk. Red = high leverage, <$10M TVL.

Analyze this DeFi market data and produce a structured markdown report:
## Market Overview
## Top Opportunities (with Green/Yellow/Red tier and specific APY ranges)
## Key Risks
## One Actionable Recommendation

Data: ${JSON.stringify(data).slice(0, 6000)}`;
        return GeminiService.generate(prompt);
    },

    /**
     * Generate a market narration — the "What's Happening" story for the dashboard.
     */
    generateNarration: async (yieldChanges: any[], topOpportunities: any[]): Promise<string> => {
        const prompt = `You are OpenClaw, LionHeart's DeFi intelligence agent on Arbitrum. Deep knowledge of Aave V3, Dolomite, Pendle, Camelot, GMX V2, Morpho, Radiant. Risk tiers: Green (safe, >$100M TVL), Yellow (medium, IL/token risk), Red (high risk).

Write a 3-4 sentence Market Story: WHAT happened to yields, WHY (market context), ONE actionable recommendation with specific protocol + pool + APY range. Speak like a sharp trader briefing the boss. Use concrete numbers. No markdown, no headers, no bullets — just flowing text.

YIELD CHANGES: ${JSON.stringify(yieldChanges).slice(0, 2000)}
TOP OPPORTUNITIES: ${JSON.stringify(topOpportunities).slice(0, 2000)}`;

        return GeminiService.generate(prompt);
    },
};
