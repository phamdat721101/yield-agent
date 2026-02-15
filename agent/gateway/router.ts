/**
 * Message router — matches user messages to agent skills and produces responses.
 *
 * Skills:
 *   - market-research: TVL, protocol data, chain analytics
 *   - trust-stamp:     sign/verify data hashes
 *   - daily-brief:     composite daily DeFi report
 *   - tutor-mode:      DeFi education and quizzes
 *   - wallet-control:  reputation-gated tx execution
 */

import {
  fetchProtocols,
  filterByChain,
  topByTvl,
  type Protocol,
} from "../lib/defillama.js";
import { sha256 } from "../lib/ipfs.js";

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

// ── Skill matchers ───────────────────────────────────────────────

const MARKET_KEYWORDS = [
  "top",
  "protocol",
  "tvl",
  "chain",
  "market",
  "defi",
  "arbitrum",
  "ethereum",
  "optimism",
  "polygon",
  "ranking",
  "compare",
];

const TUTOR_KEYWORDS = [
  "teach",
  "lesson",
  "learn",
  "quiz",
  "what is",
  "explain",
  "how does",
  "impermanent",
  "amm",
  "lending",
  "yield",
  "bridge",
  "flash loan",
  "mev",
];

const BRIEF_KEYWORDS = ["brief", "morning", "daily", "report", "summary", "today"];

const TRADE_KEYWORDS = ["swap", "trade", "deposit", "withdraw", "execute", "send"];

const TRUST_KEYWORDS = ["sign", "stamp", "verify", "trust", "signature"];

function matchSkill(message: string): string {
  const lc = message.toLowerCase();

  if (BRIEF_KEYWORDS.some((k) => lc.includes(k))) return "daily-brief";
  if (TRADE_KEYWORDS.some((k) => lc.includes(k))) return "wallet-control";
  if (TRUST_KEYWORDS.some((k) => lc.includes(k))) return "trust-stamp";
  if (TUTOR_KEYWORDS.some((k) => lc.includes(k))) return "tutor-mode";
  if (MARKET_KEYWORDS.some((k) => lc.includes(k))) return "market-research";

  return "general";
}

// ── Skill handlers ───────────────────────────────────────────────

async function handleMarketResearch(message: string): Promise<AgentResponse> {
  const lc = message.toLowerCase();

  // Detect chain
  let chain = "Arbitrum";
  for (const c of ["ethereum", "optimism", "polygon", "base", "avalanche"]) {
    if (lc.includes(c)) {
      chain = c.charAt(0).toUpperCase() + c.slice(1);
      break;
    }
  }

  // Detect top-N
  const numMatch = lc.match(/top\s*(\d+)/);
  const topN = numMatch ? parseInt(numMatch[1], 10) : 5;

  try {
    const allProtocols = await fetchProtocols();
    const chainProtocols = filterByChain(allProtocols, chain);
    const top = topByTvl(chainProtocols, topN);

    const rawJson = JSON.stringify(top);
    const dataHash = sha256(rawJson);

    const lines = top.map((p: Protocol, i: number) => {
      const tvlM = (p.tvl / 1e6).toFixed(1);
      const change = p.change_1d !== null ? ` (${p.change_1d > 0 ? "+" : ""}${p.change_1d.toFixed(1)}% 24h)` : "";
      return `${i + 1}. **${p.name}** — $${tvlM}M TVL${change} [${p.category}]`;
    });

    const response = `Here are the top ${topN} ${chain} protocols by TVL:\n\n${lines.join("\n")}\n\nData hash: \`sha256:${dataHash.slice(0, 16)}...\`\nSource: DefiLlama | ${new Date().toUTCString()}`;

    return {
      response,
      agentId: 1,
      skill: "market-research",
      metadata: { dataHash: `sha256:${dataHash}`, chain, count: topN },
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      response: `I tried to fetch ${chain} market data but hit an error: ${err.message}. Let me try again in a moment.`,
      agentId: 1,
      skill: "market-research",
      metadata: { error: err.message },
      timestamp: new Date().toISOString(),
    };
  }
}

function handleTutorMode(message: string): AgentResponse {
  const lc = message.toLowerCase();

  // Lesson selection
  if (lc.includes("lesson 1") || lc.includes("what is defi")) {
    return tutorResponse(
      `**Lesson 1: What is DeFi?**

DeFi (Decentralized Finance) replaces traditional financial intermediaries — banks, brokers, exchanges — with **smart contracts** on blockchains.

**Key Properties:**
- **Permissionless** — anyone with a wallet can participate, no KYC needed
- **Transparent** — all transactions and code are publicly verifiable
- **Composable** — protocols can be combined like LEGO blocks ("money LEGOs")
- **Non-custodial** — you control your own funds

**Major DeFi Categories:**
1. DEXs (Uniswap, Camelot) — swap tokens without an order book
2. Lending (Aave, Compound) — borrow/lend with smart contracts
3. Derivatives (GMX, dYdX) — trade perpetuals and options
4. Insurance (Nexus Mutual) — cover against smart contract risk

**Risks:** smart contract bugs, oracle failures, regulatory uncertainty, and economic exploits.

Ready for a quiz? Just say **"quiz me on lesson 1"**!`,
      { lesson: 1, tier: "free" }
    );
  }

  if (lc.includes("lesson 2") || lc.includes("wallet") || lc.includes("token")) {
    return tutorResponse(
      `**Lesson 2: Wallets & Tokens**

**Wallet Types:**
- **EOA (Externally Owned Account)** — controlled by a private key (MetaMask, Rainbow)
- **Smart Contract Wallet** — programmable (Safe, Argent), supports social recovery

**ERC-20 Tokens:**
The standard interface for fungible tokens. Key functions:
- \`transfer(to, amount)\` — send tokens
- \`approve(spender, amount)\` — allow a contract to spend your tokens
- \`transferFrom(from, to, amount)\` — used by approved contracts

**Gas & Transactions:**
Every transaction costs gas (paid in ETH). On L2s like Arbitrum, gas is 10-100x cheaper.

**Security Best Practices:**
1. Never share your private key or seed phrase
2. Revoke unused token approvals (use revoke.cash)
3. Use hardware wallets for large amounts
4. Always verify contract addresses before interacting

Say **"quiz me on lesson 2"** or **"lesson 3"** to continue!`,
      { lesson: 2, tier: "free" }
    );
  }

  if (lc.includes("lesson 3") || lc.includes("dex") || lc.includes("amm")) {
    return tutorResponse(
      `**Lesson 3: DEXs & AMMs**

**Automated Market Makers** replace traditional order books with liquidity pools.

**Constant Product Formula:**
\`x * y = k\`
Where x and y are token reserves. When you buy token X, its reserve decreases, price goes up.

**Example:**
Pool has 100 ETH + 200,000 USDC (k = 20,000,000)
You buy 1 ETH → pool now has 99 ETH + ~202,020 USDC
Price impact: you paid ~2,020 USDC instead of 2,000.

**Key Concepts:**
- **Slippage** — difference between expected and actual price
- **Price Impact** — how much your trade moves the price
- **LP Tokens** — receipt for providing liquidity (redeemable for your share)
- **MEV** — miners/validators can reorder transactions for profit (sandwich attacks)

**Popular DEXs on Arbitrum:** Uniswap V3, Camelot, SushiSwap

This completes the free tier! Lessons 4-8 cover lending, yield farming, impermanent loss, bridges, and advanced DeFi.

Say **"quiz me"** to test your knowledge!`,
      { lesson: 3, tier: "free" }
    );
  }

  if (lc.includes("lesson 4") || lc.includes("lesson 5") || lc.includes("lesson 6") || lc.includes("lesson 7") || lc.includes("lesson 8")) {
    return tutorResponse(
      `Lessons 4-8 are **premium content** (0.50 USDC via x402 payment).

**Premium Curriculum:**
4. Lending & Borrowing — Aave, liquidations, flash loans
5. Yield Farming — LP mining, APY vs APR, compounding
6. Impermanent Loss — math, mitigation, real examples
7. Bridges & Cross-chain — how bridges work, trust assumptions
8. Advanced DeFi — MEV, governance, protocol-owned liquidity

To unlock, the payment is processed through the x402 protocol. Contact the app to initiate payment.`,
      { tier: "premium", locked: true }
    );
  }

  if (lc.includes("quiz")) {
    return tutorResponse(
      `**DeFi Quiz Time!**

**Q1:** In a constant product AMM (x * y = k), what happens to the price of token Y when you buy a large amount of token X?
A) Price of Y decreases
B) Price of Y increases
C) Price of Y stays the same
D) The pool is drained

**Q2:** What does "non-custodial" mean in DeFi?
A) The government holds your funds
B) A company manages your wallet
C) You control your own private keys and funds
D) Funds are locked forever

**Q3:** Why is gas cheaper on Arbitrum than Ethereum mainnet?
A) Arbitrum uses a different token
B) Arbitrum batches transactions and posts compressed data to L1
C) Arbitrum has no security
D) Arbitrum doesn't use smart contracts

*Reply with your answers like "1B 2C 3B" and I'll grade them!*`,
      { type: "quiz", lesson: "general" }
    );
  }

  // Grade quiz answers
  if (lc.match(/^[123][abcd]\s/i) || lc.match(/\d[abcd]/gi)) {
    const answers: Record<string, string> = { "1": "b", "2": "c", "3": "b" };
    const userAnswers = lc.match(/(\d)([abcd])/gi) || [];
    let correct = 0;
    const results: string[] = [];

    for (const ua of userAnswers) {
      const q = ua[0];
      const a = ua[1].toLowerCase();
      const isCorrect = answers[q] === a;
      if (isCorrect) correct++;
      results.push(`Q${q}: ${isCorrect ? "Correct!" : `Wrong — answer is ${answers[q].toUpperCase()}`}`);
    }

    return tutorResponse(
      `**Quiz Results: ${correct}/${userAnswers.length}**\n\n${results.join("\n")}\n\n${correct === userAnswers.length ? "Perfect score! You're ready for the next lesson." : "Review the lessons and try again!"}`,
      { type: "quiz-result", score: correct, total: userAnswers.length }
    );
  }

  // Default tutor intro
  return tutorResponse(
    `Welcome to **LionHeart Tutor Mode**!

I offer a structured DeFi curriculum:

**Free Tier:**
1. What is DeFi?
2. Wallets & Tokens
3. DEXs & AMMs

**Premium Tier (0.50 USDC):**
4. Lending & Borrowing
5. Yield Farming
6. Impermanent Loss
7. Bridges & Cross-chain
8. Advanced DeFi

Say **"lesson 1"** to start, or ask any DeFi question!`,
    { tier: "free" }
  );
}

function tutorResponse(content: string, meta: Record<string, unknown>): AgentResponse {
  return {
    response: content,
    agentId: 1,
    skill: "tutor-mode",
    metadata: meta,
    timestamp: new Date().toISOString(),
  };
}

async function handleDailyBrief(): Promise<AgentResponse> {
  try {
    const allProtocols = await fetchProtocols();

    const chains = ["Arbitrum", "Ethereum", "Optimism"];
    const sections: string[] = [];

    for (const chain of chains) {
      const top = topByTvl(filterByChain(allProtocols, chain), 3);
      const lines = top.map((p, i) => {
        const tvlM = (p.tvl / 1e6).toFixed(1);
        const change = p.change_1d !== null ? ` (${p.change_1d > 0 ? "+" : ""}${p.change_1d.toFixed(1)}%)` : "";
        return `  ${i + 1}. ${p.name} — $${tvlM}M${change}`;
      });
      sections.push(`**${chain}:**\n${lines.join("\n")}`);
    }

    const totalTvl = allProtocols.reduce((sum, p) => sum + (p.tvl || 0), 0);
    const rawHash = sha256(JSON.stringify({ chains, totalTvl, date: new Date().toDateString() }));

    const response = `**LionHeart Daily Brief — ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}**

${sections.join("\n\n")}

**Total DeFi TVL:** $${(totalTvl / 1e9).toFixed(1)}B

Verified: \`sha256:${rawHash.slice(0, 16)}...\`
Source: DefiLlama`;

    return {
      response,
      agentId: 1,
      skill: "daily-brief",
      metadata: { dataHash: `sha256:${rawHash}`, totalTvl },
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      response: `Couldn't compile today's brief: ${err.message}. Try again shortly.`,
      agentId: 1,
      skill: "daily-brief",
      metadata: { error: err.message },
      timestamp: new Date().toISOString(),
    };
  }
}

function handleWalletControl(message: string): AgentResponse {
  return {
    response: `**Wallet Control — Reputation Gated**

I can execute on-chain transactions, but only after earning sufficient trust.

**Current Status:** Checking reputation... (requires score >= 100)

To build my reputation, use the chat to:
1. Ask me market research questions and rate my responses
2. Complete tutor lessons and confirm they were helpful
3. Review my daily briefs

Once I reach a reputation score of 100+, I'll be able to:
- Swap tokens on DEXs
- Deposit into lending protocols
- Execute custom transactions

All transactions will be **simulated first** and require your **explicit approval**.`,
    agentId: 1,
    skill: "wallet-control",
    metadata: { gated: true, requiredScore: 100 },
    timestamp: new Date().toISOString(),
  };
}

function handleTrustStamp(message: string): AgentResponse {
  return {
    response: `**Trust Stamp System**

Every piece of research I produce includes a SHA-256 hash of the raw data. This hash can be:

1. **Signed** with my agent private key (ECDSA)
2. **Pinned** to IPFS for permanent storage
3. **Verified** by anyone using my on-chain identity (ERC-8004)

This creates an immutable audit trail: you can prove that *this specific agent* produced *this specific data* at *this specific time*.

To see it in action, ask me a market research question — the response will include a data hash.`,
    agentId: 1,
    skill: "trust-stamp",
    metadata: {},
    timestamp: new Date().toISOString(),
  };
}

function handleGeneral(message: string): AgentResponse {
  return {
    response: `I'm **OpenClaw LionHeart**, your verifiable DeFi mentor.

Here's what I can do:

**Market Research** — "What are the top 5 protocols on Arbitrum?"
**DeFi Education** — "Teach me about DeFi" or "Start lesson 1"
**Daily Brief** — "Give me today's brief"
**Trust & Verification** — "How does trust stamping work?"
**Portfolio Management** — "Swap 100 USDC for ETH" (reputation-gated)

I have a verifiable on-chain identity (ERC-8004) and every research output is hash-stamped for transparency.

What would you like to explore?`,
    agentId: 1,
    skill: "general",
    metadata: {},
    timestamp: new Date().toISOString(),
  };
}

// ── Main router ──────────────────────────────────────────────────

export async function routeMessage(
  message: string,
  ctx: Context
): Promise<AgentResponse> {
  const skill = matchSkill(message);
  console.log(`[router] skill=${skill} message="${message.slice(0, 60)}..."`);

  switch (skill) {
    case "market-research":
      return handleMarketResearch(message);
    case "tutor-mode":
      return handleTutorMode(message);
    case "daily-brief":
      return handleDailyBrief();
    case "wallet-control":
      return handleWalletControl(message);
    case "trust-stamp":
      return handleTrustStamp(message);
    default:
      return handleGeneral(message);
  }
}
