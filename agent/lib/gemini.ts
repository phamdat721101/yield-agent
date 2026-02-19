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
        const prompt = `
You are Yield Sentry, a master DeFi strategist managing stablecoins on Arbitrum. Analyze this market data and provide a concise, actionable report. Mention risk levels (Green/Yellow/Red) and concrete numbers. No emoji headers.

DATA: ${JSON.stringify(data).slice(0, 5000)}... (truncated)

FORMAT:
## Market Overview
[Summary with numbers]

## Top Opportunities
- [Opportunity with APY, TVL, risk level]

## Risks
[Risk Analysis with specifics]
`;
        return GeminiService.generate(prompt);
    },

    /**
     * Generate a market narration — the "What's Happening" story for the dashboard.
     */
    generateNarration: async (yieldChanges: any[], topOpportunities: any[]): Promise<string> => {
        const prompt = `You are Yield Sentry, a master DeFi strategist. Write a 3-4 sentence Market Story: WHAT happened to yields, WHY (market context), ONE actionable recommendation. Speak like a sharp trader briefing the boss. Use concrete numbers. No markdown, no headers, no bullets — just flowing text.

YIELD CHANGES: ${JSON.stringify(yieldChanges).slice(0, 2000)}
TOP OPPORTUNITIES: ${JSON.stringify(topOpportunities).slice(0, 2000)}`;

        return GeminiService.generate(prompt);
    },
};
