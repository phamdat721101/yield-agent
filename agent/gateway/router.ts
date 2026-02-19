/**
 * Message router — matches user messages to agent skills using the Tool Registry pattern.
 *
 * All 8 skills registered. Gemini formats tool output into readable text.
 */

import { AgentTool } from "../lib/tools.js";
import { NewsTool } from "../skills/news.js";
import { VaultTool } from "../skills/vault.js";
import { YieldHunterTool } from "../skills/yield-hunter.js";
import { MarketResearchTool } from "../skills/market-research.js";
import { TrustStampTool } from "../skills/trust-stamp.js";
import { DailyBriefTool } from "../skills/daily-brief.js";
import { TutorModeTool } from "../skills/tutor-mode.js";
import { WalletControlTool } from "../skills/wallet-control.js";
import { x402Middleware } from "./x402.js";
import { GeminiService } from "../lib/gemini.js";
import { memory } from "../lib/memory.js";

export interface AgentResponse {
  response: string;
  agentId: number;
  skill: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

interface Context {
  walletAddress?: string;
  agentId?: number;
}

// ── Tool Registry ──
const tools: Record<string, AgentTool> = {
  "market-research": new MarketResearchTool(),
  "trust-stamp": new TrustStampTool(),
  "daily-brief": new DailyBriefTool(),
  "tutor-mode": new TutorModeTool(),
  "wallet-control": new WalletControlTool(),
  "news-analytics": new NewsTool(),
  "vault-manager": new VaultTool(),
  "yield-hunter": new YieldHunterTool(),
};

// ── Skill Matcher Logic (Keyword -> Tool Name) ──
function matchSkill(message: string): string {
  const lc = message.toLowerCase();

  // Market Research
  if (lc.includes("tvl") || lc.includes("protocol") || lc.includes("defi") || lc.includes("arbitrum"))
    return "market-research";

  // Yield Hunter
  if (lc.includes("yield") || lc.includes("apy") || lc.includes("hunt") || lc.includes("best rate"))
    return "yield-hunter";

  // Trust Stamp
  if (lc.includes("sign") || lc.includes("stamp") || lc.includes("verify"))
    return "trust-stamp";

  // Daily Brief
  if (lc.includes("brief") || lc.includes("morning") || lc.includes("daily"))
    return "daily-brief";

  // Tutor Mode
  if (lc.includes("teach") || lc.includes("lesson") || lc.includes("learn") || lc.includes("quiz"))
    return "tutor-mode";

  // Wallet Control
  if (lc.includes("swap") || lc.includes("trade") || lc.includes("deposit") || lc.includes("withdraw"))
    return "wallet-control";

  // News & Analytics
  if (lc.includes("news") || lc.includes("sentiment") || lc.includes("market update"))
    return "news-analytics";

  // Vault Management
  if (lc.includes("vault") || lc.includes("balance") || lc.includes("rebalance") || lc.includes("treasury"))
    return "vault-manager";

  // Default: let AI handle it
  return "ai-fallback";
}

/** Parse basic input hints from user message */
function parseInput(message: string): Record<string, any> {
  const lc = message.toLowerCase();
  return {
    message,
    coin: message.match(/BTC|ETH|SOL|ARB|USDC|USDT|WBTC/i)?.[0]?.toUpperCase(),
    chain: lc.match(/(?:on\s+)?(\w+)(?:\s+chain)?/)?.[1],
    top: parseInt(lc.match(/top\s+(\d+)/)?.[1] || "5", 10),
    lesson: parseInt(lc.match(/lesson\s*(\d+)/)?.[1] || "0", 10) || undefined,
    action: lc.includes("rebalance") ? "rebalance"
      : lc.includes("quiz") ? "quiz"
      : lc.includes("list") ? "list"
      : lc.includes("swap") ? "swap"
      : lc.includes("deposit") ? "deposit"
      : lc.includes("withdraw") ? "withdraw"
      : "check",
    asset: message.match(/BTC|ETH|SOL|ARB|USDC|USDT|WBTC/i)?.[0]?.toUpperCase() || "all",
    dataHash: lc.match(/(?:hash[:\s]+)([a-f0-9:]+)/)?.[1],
  };
}

/** Use Gemini to format raw tool output into readable text */
async function formatToolResponse(toolName: string, result: any, userMessage: string): Promise<string> {
  try {
    const response = await GeminiService.generate(
      `You are Yield Sentry, an elite DeFi strategist managing stablecoins on Arbitrum. You explain WHY yields change, mention risk levels (Green/Yellow/Red), reference actual numbers, and use Boss Update style for recommendations.\n\nThe user asked: "${userMessage}"\n\nThe ${toolName} tool returned this data:\n${JSON.stringify(result, null, 2)}\n\nFormat this into a clear, concise response. Use markdown for emphasis. Be direct and data-driven.`
    );
    return response;
  } catch {
    // Fallback: format as structured text
    if (result.summary) return result.summary;
    if (result.content) return result.content;
    if (result.message) return result.message;
    if (result.error) return `Error: ${result.error}${result.details ? ` — ${result.details}` : ""}`;
    return JSON.stringify(result, null, 2);
  }
}

// ── Main Router ──
export async function routeMessage(
  message: string,
  ctx: Context
): Promise<AgentResponse> {
  const skillName = matchSkill(message);
  console.log(`[router] skill=${skillName} message="${message.slice(0, 60)}..."`);

  // 1. Check if this is a registered Tool
  const tool = tools[skillName];
  if (tool) {
    // 2. Check x402 Payment Requirement
    const paymentReq = x402Middleware.checkPaymentRequirement(skillName);
    if (paymentReq) {
      const response402 = x402Middleware.generate402Response(paymentReq);
      return {
        response: response402.message,
        agentId: 1,
        skill: skillName,
        metadata: { payment_required: true, details: response402 },
        timestamp: new Date().toISOString(),
      };
    }

    // 3. Execute Tool
    try {
      const input = parseInput(message);
      const result = await tool.execute(input, ctx);
      const formattedResponse = await formatToolResponse(tool.name, result, message);

      return {
        response: formattedResponse,
        agentId: 1,
        skill: skillName,
        metadata: { tool_result: result },
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      memory.append(`Tool error [${skillName}]: ${error.message}`);
      return {
        response: `I ran into an issue with ${skillName}: ${error.message}`,
        agentId: 1,
        skill: skillName,
        metadata: { error: error.message },
        timestamp: new Date().toISOString(),
      };
    }
  }

  // ── Smart Fallback (Gemini AI) ──
  try {
    const aiResponse = await GeminiService.generate(
      `You are Yield Sentry, an elite DeFi strategist managing stablecoins on Arbitrum. You watch yields 24/7, explain WHY they change, mention risk levels (Green/Yellow/Red), and reference actual numbers. Use Boss Update style for recommendations.\n\nThe user says: "${message}"\n\nRespond helpfully and directly. If they want a specific feature, suggest the right command (e.g., "top 5 arbitrum protocols", "daily brief", "best yields", "teach me lesson 1").`
    );
    return {
      response: aiResponse,
      agentId: 1,
      skill: "ai-chat",
      timestamp: new Date().toISOString(),
    };
  } catch {
    return {
      response: "I'm having trouble connecting to my AI brain right now. Try asking about 'top arbitrum protocols', 'best yields', or 'teach me DeFi'.",
      agentId: 1,
      skill: "error",
      timestamp: new Date().toISOString(),
    };
  }
}
