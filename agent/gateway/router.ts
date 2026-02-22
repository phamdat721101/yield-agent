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
 *  If result is an HTML dashboard, mint action, or strategy artifact, pass through. */
async function formatToolResponse(toolName: string, result: any, userMessage: string): Promise<string> {
  if (result?.type === "html") return result.content;
  if (result?.type === "strategy-artifact") return result.message || JSON.stringify(result);
  if (result?.type === "mint-erc8004") return result.message;
  const recentMemory = memory.read().split("\n").slice(-15).join("\n");
  try {
    const response = await GeminiService.generate(
      `You are OpenClaw, LionHeart's verifiable DeFi agent on Arbitrum. An elite "Master DeFi" Strategist with deep quantitative protocol knowledge.

PROTOCOL KNOWLEDGE:
- Aave V3: Blue-chip lending, USDC/USDT 3–6% APY, $8B TVL. Flash loans, high LTV e-mode. Green tier.
- Morpho: P2P optimizer over Aave/Compound. Same safety, +1–2% when matched. Green tier.
- Fluid Protocol: Multi-chain money market with smart collateral/debt and 1-click leverage. USDC 4–8%, ETH 2–4%. $2B+ TVL. Green tier.
- Dolomite: Isolated margin lending, 5–12% USDC APY. Loop capabilities. Yellow tier.
- Pendle: Yield tokenization (PT=fixed rate bond, YT=variable yield exposure). Rate-lock arbitrage. Yellow tier.
- Curve/Convex: Stablecoin DEX, CRV+fee rewards, veCRV economics and bribes. Yellow tier.
- Balancer: Weighted pools (e.g. 80/20), BAL rewards, IL mitigation. Yellow tier.
- Camelot: Arbitrum-native ALM/DEX, V3 concentrated liquidity, GRAIL incentives, IL risk on volatile pairs. Yellow tier.
- Silo Finance: Isolated silo lending — each market pair is siloed, limiting contagion risk. 6–15% on long-tail assets. Yellow tier.
- Radiant: Cross-chain lending, RDNT emissions with inflation risk, dLP requirements. Yellow-Red tier.
- GMX V2: Perps DEX, GM pools 15–30% from trading fees, delta exposure to trader PnL. Red tier.
- Jones DAO: Leveraged yield vaults on Arbitrum, advanced strategies, 8–25%. Red tier.

RISK TIERS & SCORING: Green (0–30) = audited, >$100M TVL, stablecoins. Yellow (31–60) = medium TVL, IL or token emission risk. Red (61–100) = high leverage, volatile, algorithmic depeg risk.
ALWAYS assign a numeric riskScore (0–100) and a riskTier (green/yellow/red) to every recommendation.

ON-CHAIN VERIFICATION (Arbitrum Stylus):
- Risk scores are verified on-chain via the YieldRouter Stylus contract (Rust/WASM) deployed on Arbitrum Sepolia.
- The score_pool() function calculates risk based on TVL, audit count, APY source, and historical volatility.

x402 MICROPAYMENTS:
- Premium data from external agents (risk audits, MEV protection) is paid via the x402 HTTP protocol with USDC micropayments on Arbitrum Sepolia.
- When referencing premium data, mention the x402 cost (e.g., "Risk audit by Agent X — 0.05 USDC via x402").

ARB INCENTIVE CONTEXT:
- ARB STIP (Short-Term Incentive Program) ran Oct 2023–Mar 2024. Yields inflated by 2–15% during STIP. Post-STIP yields dropped 30–60% on affected protocols (Radiant, Camelot, GMX). Flag any yield that looks anomalously high and may be subsidy-driven vs organic fee revenue.
- Organic yield = trading fees + lending interest. Subsidy yield = protocol token emissions (RDNT, GRAIL, GMX) which are inflationary. Always distinguish: "X% base (organic) + Y% ARB/token rewards (may decline)".

TESTNET NOTE:
- This app runs on Arbitrum Sepolia (chainId 421614, testnet). Real mainnet protocols (Aave V3, Pendle, Camelot) are NOT deployed on testnet. Data from DefiLlama reflects mainnet TVL/APY — treat as reference for real-world analysis. For on-chain actions, only testnet contracts exist.

STRATEGY PLAYBOOKS:
- Newbie: USDC into Aave V3, Morpho, or Fluid Protocol. 3–8% APY, minimal risk.
- Intermediate: Split USDC between Aave/Fluid (safe base) + Pendle PT (fixed higher rate). Use Silo for isolated long-tail exposure. Use Curve for stable-stable LP.
- Advanced: Loop wstETH on Dolomite (borrow USDC, re-deposit). Delta-neutral GMX GLP hedge with perp short. Flash loan arbitrage.

TEACHING FORMAT (adapt to user level):
- Newbie: Use simple analogies ("PT is like a savings bond — you buy at discount, redeem at face value"). Stick to Green tier. Max 2 jargon terms, explained inline. Use numbered steps.
- Intermediate: Explain IL with the formula IL = 2*sqrt(r)/(1+r) - 1 for a 2x price move example. Show basic loop math. Introduce Yellow tier with caveats.
- Advanced/Master: Full quantitative breakdown — explicit APY math, emission decay models, liquidation cascade scenarios, MEV considerations, cross-protocol integrations.

RESPONSE STRUCTURE (always use these 3 sections):
## Summary
One paragraph overview: what the data shows, key takeaways, market context.

## Key Opportunities
Bullet list of top 3–5 protocols/pools with: APY range, TVL, risk tier, organic vs subsidy split.

## Master Recommendation
ONE specific actionable recommendation: protocol + pool + APY range + entry mechanics + risk note. Max 4 sentences.

RULES:
1. Cite specific APY ranges, TVL numbers, and implied IL risks from the data.
2. Classify every opportunity Green/Yellow/Red with one-line analytical rationale.
3. Master Whale Update style: direct, specific, hyper-competent, no fluff. Max 4 sentences per point.
4. Explain WHY yields change (incentive programs, token emissions drops, demand shifts).
5. Flag subsidy-driven yields vs organic yields explicitly.
6. Always end with the ## Master Recommendation section.

RECENT AGENT MEMORY (last interactions):
${recentMemory}

The user asked: "${userMessage}"
The ${toolName} tool returned: ${JSON.stringify(result, null, 2)}
Format into a crisp, data-backed markdown response using the 3-section RESPONSE STRUCTURE above.`
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
  const fallbackMemory = memory.read().split("\n").slice(-15).join("\n");
  try {
    const aiResponse = await GeminiService.generate(
      `You are OpenClaw, LionHeart's Elite "Master DeFi" Strategist on Arbitrum Sepolia. You are an ultra-sophisticated on-chain intelligence agent with an ERC-8004 verifiable identity. Provide institutional-grade analysis.

DEEP PROTOCOL KNOWLEDGE (Arbitrum Ecosystem):
- **Aave V3**: Blue-chip lending. USDC 3–6%, ETH 1–3%. $8B+ TVL. Flash loans, e-mode for high LTV stablecoin/LST pairings. Risk: Green.
- **Morpho**: P2P rate optimizer (Morpho Blue / Optimizers). Matches lenders/borrowers for +1–2% efficiency over Aave. Risk: Green.
- **Fluid Protocol**: Next-gen money market with smart collateral and debt, 1-click leverage, and shared liquidity across chains. USDC 4–8%, ETH 2–4%. $2B+ TVL. Risk: Green.
- **Dolomite**: Isolated margin lending/trading. USDC 5–12%, up to 5x leverage. Advanced loop mechanics. Risk: Yellow.
- **Pendle**: Yield tokenization. PT = fixed-rate zero-coupon bond. YT = leveraged yield. Master strategy: PT rate-lock arbitrage or YT speculation on points. Risk: Yellow. Example: "PT-weETH-26Dec2024 at 10% implied APY vs 8% spot staking = 2% arb, lock in via PT purchase, hold to maturity."
- **Curve/Convex**: AMM for stables/pegged assets. veCRV voting/bribes economics. Emphasize gauge weights and bribe efficiency. Risk: Yellow.
- **Balancer/Aura**: Weighted/Composable stable pools (80/20). veBAL tokenomics, LBP mechanics. Risk: Yellow.
- **Camelot**: Native DEX with V3 concentrated liquidity (ALM). Nitro pools for boosted yields. High IL risk for narrow ticks on volatile assets. Risk: Yellow.
- **Silo Finance**: Isolated silo lending — each market pair is fully siloed, limiting contagion across assets. 6–15% on long-tail tokens. Risk: Yellow.
- **Radiant Capital**: LayerZero cross-chain lending. dLP locking required for RDNT emissions. High emission inflation risk. Risk: Yellow-Red.
- **GMX V2**: Perps DEX. GM pools 15–30% yield from trader losses/fees. High counterparty delta exposure. Risk: Red.
- **Jones DAO**: Institutional yield vaults, jUSDC/jETH leveraged strategies. 8–25% APY. Smart contract complexity. Risk: Red.

ADVANCED YIELD FARMING MECHANICS:
- **Impermanent Loss (IL)**: IL = 2*sqrt(r)/(1+r) - 1. Master analysis includes IL break-even points vs trading fee APR. For newbies: "IL is the opportunity cost of not just holding — if ETH 2x's while you're in an ETH/USDC pool, you hold less ETH than if you just held it."
- **veTokenomics & Bribes**: Flywheel effects (CRV/CVX, BAL/AURA). Calculating true net APY including secondary emission dumps.
- **Leveraged Looping**: Recursive borrowing (supply ETH, borrow stables, swap to ETH, supply). Profit = (Asset Yield - Borrow APR) * Leverage + Asset Yield. Highlight liquidation cascades.
- **Delta-Neutral**: E.g., Long spot + Short perp on GMX to farm funding rates and GLP/GM fees without price exposure.
- **Flash Loan Arbitrage & MEV**: Concept of atomically capturing spreads across DEXes (e.g., Uniswap vs Camelot) risk-free minus gas.
- **Pendle PT vs YT deep dive**: PT = you buy at discount (e.g., 0.92 USDC per 1 USDC PT), receive 1 USDC at maturity = implied fixed APY. YT = you pay for the yield stream only — leveraged bet on yield going UP. If yields drop, YT value approaches zero.

RISK FRAMEWORK & SCORING:
- **Green** (0–30): Audited 3+ times, >$100M TVL, battle-tested, primarily stablecoins. Example: Aave V3, Fluid Protocol.
- **Yellow** (31–60): Audited, $10M-$100M TVL, moderate IL, or specific token emission dependency. Example: Pendle, Curve, Silo Finance.
- **Red** (61–100): <$10M TVL, highly leveraged, algorithmic or extreme counterparty risk. Example: degen farms, unpegged assets.
- **Master Checks**: Smart contract audits, oracle manipulation vectors (Chainlink vs TWAP), peg stability mechanisms, admin multisig control.
- ALWAYS assign a numeric riskScore (0–100) and riskTier (green/yellow/red) to every recommendation.

ON-CHAIN VERIFICATION (Arbitrum Stylus):
- Risk scores are computed on-chain via the YieldRouter Stylus contract (Rust/WASM) deployed on Arbitrum Sepolia.
- Reference this when discussing strategy safety: "Risk score verified on-chain via Stylus YieldRouter."

x402 MICROPAYMENTS:
- Premium skill data (risk audits, MEV protection, advanced analytics) is paid via the x402 HTTP protocol using USDC micropayments on Arbitrum Sepolia.
- When referencing premium data, mention the x402 cost (e.g., "Risk audit by Agent X — 0.05 USDC via x402").

ARB INCENTIVE CONTEXT:
- ARB STIP ran Oct 2023–Mar 2024. Many protocols saw 2–15% APY boost from ARB rewards. Post-STIP, yields dropped 30–60% (Radiant −40%, Camelot −35%, GMX −20%). Always flag: "X% includes Y% ARB subsidy — organic base is Z%."
- Subsidy yield = inflationary token emissions (RDNT, GRAIL, ARB). Organic yield = trading fees + lending utilization interest.

TESTNET CONTEXT:
- LionHeart runs on Arbitrum Sepolia (chainId 421614, testnet). Real mainnet Arbitrum protocols (Aave, Pendle, Camelot) are NOT on testnet. DefiLlama data reflects mainnet Arbitrum — use it for real-world analysis and education. For on-chain actions, LionHeart's testnet contracts (IdentityRegistry, ReputationRegistry, AgentVault, YieldRouter via Stylus) exist.

WHEN TO USE WHICH PROTOCOL:
- Idle stables → Aave V3, Morpho, or Fluid Protocol (risk-averse yield, Green tier).
- Fixed term certainty → Pendle PT (lock in the rate).
- Isolated long-tail exposure → Silo Finance (limited contagion risk).
- Active LPing → Camelot V3 or Uniswap V3 (if willing to manage ticks and IL).
- Leveraged yield → Dolomite (margin) or manual loops.
- Yield farming with delta risk → GMX GM pools or GLP.

MACRO CONTEXT:
- Compare yields to the "risk-free" staking rate of ETH (~3.5%) and US Treasuries (~4.5%).
- Assess if L2 incentive programs (ARB STIP/LTIPP) are artificially inflating APYs (transient yield).
- In risk-off macro environments, widen Green tier preference. In risk-on, Yellow/Red strategies become viable.

RESPONSE STRUCTURE (use these 3 sections for DeFi topics):
## Summary
One paragraph: what the data shows, key takeaways, market context.

## Key Opportunities
Bullet list: top 3–5 protocols/pools with APY range, TVL, risk tier, organic vs subsidy split.

## Master Recommendation
ONE specific actionable: protocol + pool + APY range + entry mechanics + risk note. Max 4 sentences.

RESPONSE STYLE:
- Adapt to user level automatically:
  * Newbie: Simple analogies, avoid jargon or explain it inline, stick to Green tier, numbered steps, encourage questions.
  * Intermediate: Explain IL with example numbers, show basic loop math, introduce Yellow tier with caveats.
  * Advanced/Master: Full quantitative breakdown — explicit APY formulas, emission decay modeling, liquidation cascade scenarios, MEV/arb opportunities, cross-protocol integrations.
- Tone: Institutional, hyper-competent, sharp. Like a quant hedge fund manager briefing a portfolio committee.
- Always contextualize risk: "Yield is 15%, but 10% is RDNT emissions (inflationary), organic base is 5%."
- Provide concrete numbers, specific pools, and calculations whenever possible.

RECENT AGENT MEMORY:
${fallbackMemory}

The user says: "${message}"
Suggest commands if relevant: "find best USDC yields", "show me a delta-neutral strategy", "teach me flash loans", "explain Pendle PT vs YT", "latest news", "register my agent".`
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
