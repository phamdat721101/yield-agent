import { AgentTool } from "../lib/tools.js";

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

            // Basic "Sentiment" Analysis (Mock AI for speed)
            // Real implementation would use an LLM here
            const sentiments = posts.map(p => {
                const title = p.title.toLowerCase();
                let score = 0;
                if (title.includes("bull") || title.includes("surge") || title.includes("high") || title.includes("growth")) score += 1;
                if (title.includes("bear") || title.includes("drop") || title.includes("low") || title.includes("crash")) score -= 1;
                return score;
            });

            const totalScore = sentiments.reduce((a, b) => a + b, 0);
            const sentimentLabel = totalScore > 0 ? "Bullish" : totalScore < 0 ? "Bearish" : "Neutral";

            return {
                coin,
                sentiment: sentimentLabel,
                score: totalScore,
                highlight: posts[0].title,
                source: posts[0].source, // domain usually
                url: posts[0].url,
                timestamp: new Date().toISOString()
            };

        } catch (err: any) {
            return { error: "Fetch Failed", details: err.message };
        }
    }
}
