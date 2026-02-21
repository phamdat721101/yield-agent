import { AgentTool } from "../lib/tools.js";
import { GeminiService } from "../lib/gemini.js";

interface NewsItem {
    title: string;
    source: string;
    url: string;
    published_at: string;
    currencies: Array<{ code: string; title: string }>;
}

/**
 * News Analytics Tool
 * Fetches real-time crypto news from CryptoPanic and provides a simple sentiment analysis.
 */
export class NewsTool implements AgentTool {
    name = "news-analytics";
    description = "Fetches latest crypto news and analyzes market sentiment. Input: { coin: 'ETH' }";

    private apiKey: string;

    constructor() {
        this.apiKey = process.env.CRYPTOPANIC_API_KEY || "";
    }

    async execute(input: any): Promise<any> {
        if (!this.apiKey) {
            return {
                error: "Configuration Error",
                message: "CRYPTOPANIC_API_KEY is missing. Please add it to .env or ask the admin."
            };
        }

        const coin = input.coin || "BTC";
        const url = `https://cryptopanic.com/api/v1/posts/?auth_token=${this.apiKey}&currencies=${coin}&kind=news&filter=important`;

        console.log(`[NewsTool] Fetching for ${coin}...`);

        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`API Error: ${res.status}`);

            const data = await res.json();
            const posts: NewsItem[] = data.results.slice(0, 5); // Top 5 results

            if (!posts.length) return { message: `No recent important news found for ${coin}.` };

            const headlines = posts.map(p => p.title).join("\n");
            const sentimentRaw = await GeminiService.generate(
                `You are a DeFi market analyst. Analyze these crypto news headlines and return a JSON object with:
- "label": "Bullish" | "Bearish" | "Neutral"
- "score": number from -5 to +5
- "reasoning": one sentence why
- "defi_impact": one sentence on Arbitrum DeFi impact specifically

Headlines:\n${headlines}\n\nReturn valid JSON only.`
            );
            let parsed: { label: string; score: number; reasoning: string; defi_impact: string } = {
                label: "Neutral", score: 0,
                reasoning: "Analysis unavailable",
                defi_impact: "No specific Arbitrum impact",
            };
            try { parsed = JSON.parse(sentimentRaw); } catch {}

            return {
                coin,
                sentiment: parsed.label,
                score: parsed.score,
                reasoning: parsed.reasoning,
                defi_impact: parsed.defi_impact,
                highlight: posts[0].title,
                source: posts[0].source,
                url: posts[0].url,
                timestamp: new Date().toISOString(),
            };

        } catch (err: any) {
            return { error: "Fetch Failed", details: err.message };
        }
    }
}
