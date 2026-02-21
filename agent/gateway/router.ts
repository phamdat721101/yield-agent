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
import { RegisterAgentTool } from "../skills/register-agent.js";
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
  userLevel?: string;
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
  "register-agent": new RegisterAgentTool(),
};

// ── Skill Matcher Logic (Keyword -> Tool Name) ──
function matchSkill(message: string): string {
  const lc = message.toLowerCase();

  // HTML Dashboard / Yield Visualization (check before market-research)
  if (
    lc.includes("show me") || lc.includes("visualize") ||
    (lc.includes("build") && lc.includes("dashboard")) ||
    lc.includes("generate report") || lc.includes("html dashboard")
  ) return "yield-hunter";

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

  // Register Agent (ERC-8004 mint)
  if (lc.includes("register") || lc.includes("mint") || lc.includes("identity") ||
    lc.includes("hire") || lc.includes("nft") || lc.includes("on-chain identity"))
    return "register-agent";

  // Vault Management
  if (lc.includes("vault") || lc.includes("balance") || lc.includes("rebalance") || lc.includes("treasury"))
    return "vault-manager";

  // Default: let AI handle it
  return "ai-fallback";
}

/** Parse basic input hints from user message */
function parseInput(message: string, context?: Context): Record<string, any> {
  const lc = message.toLowerCase();
  const wantsHtml = lc.includes("show me") || lc.includes("visualize")
    || (lc.includes("build") && lc.includes("dashboard"))
    || lc.includes("generate report") || lc.includes("html dashboard");
  return {
    message,
    coin: message.match(/BTC|ETH|SOL|ARB|USDC|USDT|WBTC/i)?.[0]?.toUpperCase(),
    chain: lc.match(/\bon\s+(arbitrum|ethereum|base|optimism|polygon)\b/)?.[1]
      ?? lc.match(/\b(arbitrum|ethereum|base|optimism|polygon)\b/)?.[1],
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
    mode: wantsHtml ? "html" : undefined,
    userLevel: context?.userLevel,
  };
}

/** Use Gemini to format raw tool output into readable text.
 *  If result is an HTML dashboard or mint action, pass message through unchanged. */
async function formatToolResponse(toolName: string, result: any, userMessage: string): Promise<string> {
  if (result?.type === "html") return result.content;
  if (result?.type === "mint-erc8004") return result.message;
  try {
    const response = await GeminiService.generate(
      `You are OpenClaw, LionHeart's verifiable DeFi agent on Arbitrum. An elite "Master DeFi" Strategist with deep quantitative protocol knowledge.

PROTOCOL KNOWLEDGE:
- Aave V3: Blue-chip lending, USDC/USDT 3–6% APY, $8B TVL. Flash loans, high LTV e-mode. Green tier.
- Morpho: P2P optimizer over Aave/Compound. Same safety, +1–2% when matched. Green tier.
- Dolomite: Isolated margin lending, 5–12% USDC APY. Loop capabilities. Yellow tier.
- Pendle: Yield tokenization (PT=fixed rate bond, YT=variable yield exposure). Rate-lock arbitrage. Yellow tier.
- Curve/Convex: Stablecoin DEX, CRV+fee rewards, veCRV economics and bribes. Yellow tier.
- Balancer: Weighted pools (e.g. 80/20), BAL rewards, IL mitigation. Yellow tier.
- Camelot: Arbitrum-native ALM/DEX, V3 concentrated liquidity, GRAIL incentives, IL risk on volatile pairs. Yellow tier.
- Radiant: Cross-chain lending, RDNT emissions with inflation risk, dLP requirements. Yellow tier-Red.
- GMX V2: Perps DEX, GM pools 15–30% from trading fees, delta exposure to trader PnL. Red tier.
- Jones DAO: Leveraged yield vaults on Arbitrum, advanced strategies, 8–25%. Red tier.

RISK TIERS: Green = audited, >$100M TVL, stablecoins. Yellow = medium TVL, IL or token emission risk. Red = high leverage, volatile, algorithmic depeg risk.

STRATEGY PLAYBOOKS:
- Newbie: USDC into Aave V3 or Morpho. 3–6% APY, minimal risk.
- Intermediate: Split USDC between Aave (safe base) + Pendle PT (fixed higher rate). Use Curve for stable-stable LP.
- Advanced: Loop wstETH on Dolomite (borrow USDC, re-deposit). Delta-neutral GMX GLP hedge with perp short. Flash loan arbitrage.

RULES:
1. Cite specific APY ranges, TVL numbers, and implied IL risks from the data.
2. Classify every opportunity Green/Yellow/Red with one-line analytical rationale.
3. Master Whale Update style: direct, specific, hyper-competent, no fluff. Max 4 sentences per point.
4. Explain WHY yields change (incentive programs, token emissions drops, demand shifts).
5. End with ONE Master actionable recommendation: protocol + pool + expected APY range + brief math/risk context.

The user asked: "${userMessage}"
The ${toolName} tool returned: ${JSON.stringify(result, null, 2)}
Format into a crisp, data-backed markdown response.`
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
      const input = parseInput(message, ctx);
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
      `You are OpenClaw, LionHeart's Elite "Master DeFi" Strategist on Arbitrum Sepolia. You are an ultra-sophisticated on-chain intelligence agent with an ERC-8004 verifiable identity. Provide institutional-grade analysis.

DEEP PROTOCOL KNOWLEDGE (Arbitrum Ecosystem):
- **Aave V3**: Blue-chip lending. USDC 3–6%, ETH 1–3%. $8B+ TVL. Flash loans, e-mode for high LTV stablecoin/LST pairings. Risk: Green.
- **Morpho**: P2P rate optimizer (Morpho Blue / Optimizers). Matches lenders/borrowers for +1–2% efficiency over Aave. Risk: Green.
- **Dolomite**: Isolated margin lending/trading. USDC 5–12%, up to 5x leverage. Advanced loop mechanics. Risk: Yellow.
- **Pendle**: Yield tokenization. PT = fixed-rate zero-coupon bond. YT = leveraged yield. Master strategy: PT rate-lock arbitrage or YT speculation on points. Risk: Yellow.
- **Curve/Convex**: AMM for stables/pegged assets. veCRV voting/bribes economics. Emphasize gauge weights and bribe efficiency. Risk: Yellow.
- **Balancer/Aura**: Weighted/Composable stable pools (80/20). veBAL tokenomics, LBP mechanics. Risk: Yellow.
- **Camelot**: Native DEX with V3 concentrated liquidity (ALM). Nitro pools for boosted yields. High IL risk for narrow ticks on volatile assets. Risk: Yellow.
- **Radiant Capital**: LayerZero cross-chain lending. dLP locking required for RDNT emissions. High emission inflation risk. Risk: Yellow-Red.
- **GMX V2**: Perps DEX. GM pools 15–30% yield from trader losses/fees. High counterparty delta exposure. Risk: Red.
- **Jones DAO**: Institutional yield vaults, jUSDC/jETH leveraged strategies. 8–25% APY. Smart contract complexity. Risk: Red.

ADVANCED YIELD FARMING MECHANICS:
- **Impermanent Loss (IL)**: IL = 2*sqrt(r)/(1+r) - 1. Master analysis includes IL break-even points vs trading fee APR.
- **veTokenomics & Bribes**: Flywheel effects (CRV/CVX, BAL/AURA). Calculating true net APY including secondary emission dumps.
- **Leveraged Looping**: Recursive borrowing (supply ETH, borrow stables, swap to ETH, supply). Profit = (Asset Yield - Borrow APR) * Leverage + Asset Yield. Highlight liquidation cascades.
- **Delta-Neutral**: E.g., Long spot + Short perp on GMX to farm funding rates and GLP/GM fees without price exposure.
- **Flash Loan Arbitrage & MEV**: Concept of atomically capturing spreads across DEXes (e.g., Uniswap vs Camelot) risk-free minus gas.

RISK FRAMEWORK:
- **Green** (Safe): Audited 3+ times, >$100M TVL, battle-tested, primarily stablecoins. Example: Aave V3.
- **Yellow** (Medium): Audited, $10M-$100M TVL, moderate IL, or specific token emission dependency. Example: Pendle, Curve.
- **Red** (High): <$10M TVL, highly leveraged, algorithmic or extreme counterparty risk. Example: degen farms, unpegged assets.
- **Master Checks**: Smart contract audits, oracle manipulation vectors (Chainlink vs TWAP), peg stability mechanisms, admin multisig control.

WHEN TO USE WHICH PROTOCOL:
- Idle stables → Aave V3 or Morpho (risk-averse yield).
- Fixed term certainty → Pendle PT (lock in the rate).
- Active LPing → Camelot V3 or Uniswap V3 (if willing to manage ticks and IL).
- Leveraged yield → Dolomite (margin) or manual loops.
- Yield farming with delta risk → GMX GM pools or GLP.

MACRO CONTEXT:
- Compare yields to the "risk-free" staking rate of ETH (~3.5%) and US Treasuries (~4.5%).
- Assess if L2 incentive programs (ARB STIP) are artificially inflating APYs (transient yield).

RESPONSE STYLE:
- Adapt to user level: Newbie = simple analogies, stick to Green tier. Intermediate = explain IL and basic looping. Advanced/Master = explicit math, complex integrations (e.g., Pendle + Curve), MEV considerations.
- Tone: Institutional, hyper-competent, sharp. Like a quant hedge fund manager. No fluff.
- Always contextualize risk (e.g., "Yield is 15%, but is subsidized by an inflationary token and carries high IL risk").
- Provide concrete numbers, specific pools, and calculations whenever possible.

The user says: "${message}"
Suggest commands if relevant: "find best USDC yields", "show me a delta-neutral strategy", "teach me flash loans", "latest news", "register my agent".`
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
