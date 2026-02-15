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
      You are an expert DeFi Analyst. Analyze this raw market data and provide a concise, actionable report:
      
      DATA: ${JSON.stringify(data).slice(0, 5000)}... (truncated)

      FORMAT:
      ## 🚀 Market Overview
      [Summary]

      ## 🔥 Top Opportunities
      - [Opportunity 1]
      - [Opportunity 2]

      ## ⚠️ Risks
      [Risk Analysis]
    `;
        return GeminiService.generate(prompt);
    }
};
