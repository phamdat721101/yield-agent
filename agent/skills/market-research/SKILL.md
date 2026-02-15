# Market Research

## Description
Fetch and analyze DeFi market data from DefiLlama. Returns protocol TVL rankings, chain comparisons, and trend analysis. Every response includes a SHA-256 hash of the raw data for verifiability.

## Trigger
User asks about DeFi markets, protocol comparisons, TVL data, or chain analytics.

## Examples
- "What are the top 5 protocols on Arbitrum by TVL?"
- "Compare TVL across Layer 2 chains"
- "How has Aave's TVL changed recently?"

## Steps
1. Parse user query to determine scope (chain, protocol, top-N)
2. Call DefiLlama API via `fetch-defi-data.ts`
3. Compute SHA-256 hash of raw API response
4. Synthesize a human-readable summary with key metrics
5. Return summary + data hash for trust-stamp verification

## Output Format
```json
{
  "summary": "Human-readable analysis...",
  "data": [...],
  "dataHash": "sha256:abcdef...",
  "source": "defillama",
  "timestamp": "2025-01-01T00:00:00Z"
}
```
