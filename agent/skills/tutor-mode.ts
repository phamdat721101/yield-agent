import { AgentTool } from "../lib/tools.js";
import { GeminiService } from "../lib/gemini.js";
import { memory } from "../lib/memory.js";

/**
 * Tutor Mode Tool — DeFi curriculum with free/premium lessons
 *
 * Lessons 1-3: free (Module 1: Foundations)
 * Lessons 4-8: premium (Modules 2-3, gated by x402)
 */

const CURRICULUM: Record<number, { title: string; topics: string[]; module: string }> = {
    1: {
        title: "What is DeFi?",
        module: "Foundations",
        topics: [
            "Traditional finance vs decentralized finance",
            "Key properties: permissionless, transparent, composable",
            "Major DeFi categories: DEXs, lending, derivatives, insurance",
            "Risks: smart contract bugs, oracle failures, regulatory uncertainty",
        ],
    },
    2: {
        title: "Wallets & Tokens",
        module: "Foundations",
        topics: [
            "EOAs vs smart contract wallets",
            "ERC-20 token standard",
            "Gas and transaction lifecycle",
            "Token approvals and security best practices",
        ],
    },
    3: {
        title: "DEXs & AMMs",
        module: "Foundations",
        topics: [
            "Order book DEXs vs AMM DEXs",
            "Constant product formula: x * y = k",
            "Liquidity pools and LP tokens",
            "Slippage, price impact, MEV",
        ],
    },
    4: {
        title: "Lending & Borrowing",
        module: "Intermediate",
        topics: [
            "Over-collateralized lending (Aave, Compound)",
            "Interest rate models",
            "Health factor and liquidation mechanics",
            "Flash loans: uncollateralized borrowing in one transaction",
        ],
    },
    5: {
        title: "Yield Farming",
        module: "Intermediate",
        topics: [
            "Liquidity mining and reward tokens",
            "APY vs APR calculation",
            "Compounding strategies",
            "Risks: impermanent loss, rug pulls, smart contract risk",
        ],
    },
    6: {
        title: "Impermanent Loss Deep Dive",
        module: "Intermediate",
        topics: [
            "Mathematical derivation: IL = 2sqrt(p) / (1+p) - 1",
            "Price ratio scenarios and loss curves",
            "Mitigation: concentrated liquidity, stablecoin pairs, single-sided staking",
            "Real examples from Uniswap v3 positions",
        ],
    },
    7: {
        title: "Bridges & Cross-chain",
        module: "Advanced",
        topics: [
            "Lock-and-mint vs liquidity network bridges",
            "Trust assumptions: multisig, optimistic, ZK",
            "Major bridges: Arbitrum native, Stargate, Across",
            "Bridge exploit post-mortems",
        ],
    },
    8: {
        title: "Advanced DeFi",
        module: "Advanced",
        topics: [
            "Flash loan attack vectors and defenses",
            "MEV: frontrunning, sandwich attacks, backrunning",
            "Governance: token voting, delegation, veToken models",
            "Protocol-owned liquidity and treasury management",
        ],
    },
};

export class TutorModeTool implements AgentTool {
    name = "tutor-mode";
    description =
        "DeFi curriculum with 8 lessons. Lessons 1-3 are free, 4-8 are premium. Input: { lesson?: number, action?: 'list' | 'teach' | 'quiz' }";

    /** Lessons 4+ require x402 payment */
    static PREMIUM_LESSONS = [4, 5, 6, 7, 8];

    async execute(input: any): Promise<any> {
        const action = input.action || "teach";
        const lesson = input.lesson || this.parseLesson(input.message || "");

        // List all lessons
        if (action === "list" || !lesson) {
            const listing = Object.entries(CURRICULUM).map(([num, l]) => {
                const isPremium = TutorModeTool.PREMIUM_LESSONS.includes(Number(num));
                return `${num}. ${l.title} (${l.module})${isPremium ? " [Premium]" : " [Free]"}`;
            });
            return {
                type: "Tutor Mode",
                action: "list",
                curriculum: listing.join("\n"),
                message: "Here are all available lessons. Say 'teach me lesson X' to start.",
            };
        }

        const lessonData = CURRICULUM[lesson];
        if (!lessonData) {
            return {
                type: "Tutor Mode",
                error: `Lesson ${lesson} not found. Available: 1-8.`,
            };
        }

        // Check premium gate
        if (TutorModeTool.PREMIUM_LESSONS.includes(lesson)) {
            return {
                type: "Tutor Mode",
                action: "premium_required",
                lesson,
                title: lessonData.title,
                message: `Lesson ${lesson}: "${lessonData.title}" is premium content (0.50 USDC). Use x402 payment to unlock.`,
                price: { amount: 0.5, currency: "USDC" },
            };
        }

        // Generate lesson content via Gemini
        if (action === "quiz") {
            return this.generateQuiz(lesson, lessonData);
        }

        return this.generateLesson(lesson, lessonData);
    }

    private parseLesson(message: string): number | null {
        const match = message.match(/lesson\s*(\d+)/i) || message.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : null;
    }

    private async generateLesson(
        lesson: number,
        data: { title: string; topics: string[]; module: string }
    ) {
        const topicsStr = data.topics.map((t, i) => `${i + 1}. ${t}`).join("\n");
        let content: string;
        try {
            content = await GeminiService.generate(
                `You are a DeFi tutor. Teach Lesson ${lesson}: "${data.title}" covering these topics:\n${topicsStr}\n\nWrite a clear, beginner-friendly explanation (4-6 paragraphs). Use examples where helpful. End with a key takeaway.`
            );
        } catch {
            content = `**Lesson ${lesson}: ${data.title}**\n\nTopics covered:\n${topicsStr}\n\n(AI content generation unavailable — please try again later.)`;
        }

        memory.append(`Tutor: delivered lesson ${lesson} — ${data.title}`);

        return {
            type: "Tutor Mode",
            action: "teach",
            lesson,
            title: data.title,
            module: data.module,
            content,
        };
    }

    private async generateQuiz(
        lesson: number,
        data: { title: string; topics: string[]; module: string }
    ) {
        let quiz: string;
        try {
            quiz = await GeminiService.generate(
                `Create a 3-question multiple choice quiz for DeFi Lesson ${lesson}: "${data.title}". Topics: ${data.topics.join(", ")}. Format each question with A/B/C/D options and mark the correct answer.`
            );
        } catch {
            quiz = `Quiz for Lesson ${lesson} unavailable — AI service down.`;
        }

        memory.append(`Tutor: quiz for lesson ${lesson} — ${data.title}`);

        return {
            type: "Tutor Mode",
            action: "quiz",
            lesson,
            title: data.title,
            quiz,
        };
    }
}
