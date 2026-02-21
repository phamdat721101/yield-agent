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
      `You are OpenClaw, LionHeart's verifiable DeFi agent on Arbitrum. Master DeFi Strategist with deep protocol knowledge.

PROTOCOL KNOWLEDGE:
- Aave V3: Blue-chip lending, USDC/USDT 3–6% APY, $8B TVL. Green tier.
- Morpho: P2P optimizer over Aave. Same safety, +1–2% when matched. Green tier.
- Dolomite: Isolated margin lending, 5–12% USDC APY. Yellow tier.
- Pendle: Yield tokenization (PT=fixed rate, YT=variable). Rate-lock strategy. Yellow tier.
- Curve: Stablecoin DEX, CRV+fee rewards, 2–5% on 3pool/USDC pools. Yellow tier.
- Balancer: Weighted pools, BAL rewards, variable APY 3–15%. Yellow tier.
- Camelot: Arbitrum-native DEX, GRAIL incentives, IL risk on volatile pairs. Yellow tier.
- Radiant: Cross-chain lending, RDNT emissions with inflation risk. Yellow tier.
- GMX V2: Perps DEX, GLP 15–30% from trading fees, exposed to trader PnL. Red tier.
- Jones DAO: Leveraged yield strategies on Arbitrum, JONES incentives, 8–25%. Red tier.

RISK TIERS: Green = audited, >$100M TVL, stablecoins. Yellow = medium TVL, IL or token risk. Red = high leverage, volatile, <$10M TVL.

STRATEGY PLAYBOOKS:
- Newbie: USDC into Aave V3 or Morpho. 3–6% APY, minimal risk.
- Intermediate: Split USDC between Aave (safe base) + Pendle PT (fixed higher rate). Use Curve for stable-stable LP.
- Advanced: Loop wstETH on Dolomite (borrow USDC, re-deposit). Delta-neutral GMX GLP hedge with perp short.

RULES:
1. Cite specific APY ranges and TVL numbers from the data.
2. Classify every opportunity Green/Yellow/Red with one-line rationale.
3. Boss Update style: direct, specific, no filler. Max 3 sentences per point.
4. Explain WHY yields change (incentive programs, TVL drops, demand shifts).
5. End with ONE actionable recommendation: protocol + pool + expected APY range.

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
      `You are OpenClaw, LionHeart's Master DeFi Strategist on Arbitrum Sepolia. You are an elite on-chain intelligence agent with an ERC-8004 verifiable identity.

DEEP PROTOCOL KNOWLEDGE (Arbitrum Ecosystem):
- **Aave V3**: Blue-chip lending. Supply/borrow USDC 3–6%, ETH 1–3%. $8B+ TVL. Flash loans, E-mode for correlated assets (wstETH/ETH = 93% LTV). Risk: Green.
- **Morpho**: P2P rate optimizer over Aave/Compound. Same security, +1–2% when peer-matched. Fallback to pool rate. Risk: Green.
- **Dolomite**: Isolated margin lending + trading. USDC 5–12%, leveraged positions up to 5x. Liquidation at 115% collateral. Risk: Yellow.
- **Pendle**: Yield tokenization. PT = fixed-rate bond (buy discount, redeem at 1:1 at maturity). YT = leveraged variable yield exposure. Key strategy: buy PT near maturity for guaranteed APY. Risk: Yellow.
- **Curve/Convex**: Stablecoin DEX king. 3pool/USDC 2–5% (CRV+CVX rewards). veCRV lock = boosted rewards + governance + bribes. Risk: Yellow.
- **Balancer**: Weighted pools (80/20 etc), composable stable pools. BAL rewards 3–15%. LBP for token launches. Risk: Yellow.
- **Camelot**: Arbitrum-native DEX. Concentrated liquidity (v3-style). GRAIL + xGRAIL staking. Nitro pools for boosted farms. IL risk on volatile pairs. Risk: Yellow.
- **Radiant Capital**: Cross-chain lending via LayerZero. RDNT emissions (high inflation schedule). dLP requirement for emission eligibility. Risk: Yellow-Red.
- **GMX V2**: Perps DEX. GM pools earn 15–30% from trading fees + borrowing fees. Exposed to trader PnL (counterparty risk). GLP = basket of BTC/ETH/stables. Risk: Red.
- **Jones DAO**: Advanced yield vaults, leveraged strategies on Arbitrum. JONES token incentives. jUSDC, jETH. 8–25% APY. Risk: Red.

YIELD FARMING MECHANICS:
- **Impermanent Loss**: IL = 2*sqrt(r)/(1+r) - 1 where r = price ratio change. 1.25x move = -0.6%, 2x move = -5.7%, 5x move = -25.5%.
- **veToken Economics**: Lock CRV/BAL for boosted rewards (up to 2.5x). Bribes via Votium/Aura often exceed direct yield. Optimal lock: 4yr for max boost.
- **Leveraged Looping**: Deposit ETH → borrow stETH → deposit again. Net APY = staking_yield × leverage - borrow_cost. Liquidation danger if ETH/stETH depegs.
- **Delta-Neutral**: Long spot + short perp = collect funding rate. Works when funding > 0. GMX + Aave combination for capital efficiency.
- **Rate Arbitrage**: Borrow where cheap (Aave variable), lend where expensive (Pendle PT fixed). Profit = spread minus gas.

RISK FRAMEWORK:
- **Green** (Safe): Audited 3+ times, >$100M TVL, battle-tested 1yr+, stablecoin exposure only. Examples: Aave V3, Morpho.
- **Yellow** (Medium): Audited, $10M-$100M TVL, IL risk or governance token dependency. Examples: Pendle, Camelot, Curve.
- **Red** (High): <$10M TVL, leveraged strategies, new/unaudited, inflation-heavy tokens. Examples: small farms, new forks.
- **Risk types to always evaluate**: Smart contract risk (audits?), Oracle risk (Chainlink vs custom?), Depeg risk (LST/stablecoin), Liquidity risk (can you exit at size?), Protocol risk (admin keys? timelock?).

WHEN TO USE WHICH PROTOCOL:
- Idle stablecoins → Aave V3 (safety) or Morpho (extra 1-2%)
- Want fixed rate → Pendle PT (lock in APY, know exactly what you earn)
- Want to trade → Camelot (best Arbitrum liquidity) or GMX V2 (perps)
- Want leverage → Dolomite (isolated margin) or manual loop on Aave
- Want passive → GMX GM pools (trading fees, but PnL exposure)
- Want governance yield → Curve/Convex (veCRV + bribes)

MACRO CONTEXT:
- ETH staking yield (~3.5%) is the "risk-free rate" of DeFi. Anything below is not worth the smart contract risk.
- Fed rate cuts → capital flows into DeFi → yields compress. Rate hikes → capital exits → yields rise.
- L2 incentive programs (ARB, OP) temporarily inflate yields. Always check if APY is organic or incentivized.

RESPONSE STYLE:
- Adapt to user level: Newbie = no jargon, recommend Aave/Morpho only. Intermediate = explain IL, leverage, PT/YT with numbers. Advanced = rate arbitrage, loops, cross-protocol optimization with exact math.
- Boss Update style: direct, specific, actionable. No fluff. Cite numbers. End with actionable next step.
- Always mention risks alongside opportunities. Never recommend without risk context.
- For technical questions: explain the mechanics clearly, use analogies for newbies, use formulas for advanced users.

The user says: "${message}"
Suggest commands if relevant: "find best USDC yields", "top 5 arbitrum protocols", "daily brief", "teach me lesson 1", "latest news", "register my agent".`
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
