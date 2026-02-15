# Daily Brief

## Description
Composes a daily DeFi market briefing by chaining market-research and trust-stamp skills. Designed to run on a cron schedule (e.g., every morning at 8 AM UTC).

## Trigger
- Cron schedule: `0 8 * * *` (daily at 8 AM UTC)
- User command: "Give me today's brief"

## Steps
1. Run market-research for top 10 protocols across key chains (Arbitrum, Ethereum, Optimism)
2. Compare with previous day's data (if cached)
3. Highlight notable changes (>5% TVL swing, new protocols in top 10)
4. Sign the brief via trust-stamp
5. Format as a concise, chat-friendly message

## Output Format
```
📊 LionHeart Daily Brief — Jan 1, 2025

**Arbitrum Highlights:**
- GMX holds #1 at $543M TVL (+2.3%)
- Radiant Capital surged +12% to $210M

**Cross-chain:**
- Total DeFi TVL: $85.2B (–0.4%)
- Arbitrum market share: 3.2%

🔏 Verified: sha256:abc... | Sig: 0xdef...
```
